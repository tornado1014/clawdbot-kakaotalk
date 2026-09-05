/**
 * Slack 봇 서버
 * @slack/bolt Socket Mode - 공개 URL 없이 WebSocket으로 연결
 */

import { App, LogLevel } from "@slack/bolt";
import { config } from "./config";
import { logger } from "./logger";
import {
  isUserVerified,
  verifyPairingCode,
  addConversationMessage,
  getConversationHistory,
  clearConversationHistory,
} from "./session-manager";
import { askClawdbot } from "./clawdbot-bridge";
import { handleCommand, isCommand } from "./command-handler";

// Slack 유저 ID 앞에 네임스페이스 추가 (Kakao 사용자와 구분)
function slackUserId(userId: string): string {
  return `slack:${userId}`;
}

/**
 * Slack App 초기화
 */
function createSlackApp(): App {
  const socketMode = !!config.slack.appToken;

  if (socketMode) {
    return new App({
      token: config.slack.botToken,
      appToken: config.slack.appToken!,
      socketMode: true,
      logLevel: LogLevel.WARN,
    });
  } else {
    // HTTP 모드 (기존 Express 서버와 별도 포트 사용)
    return new App({
      token: config.slack.botToken,
      signingSecret: config.slack.signingSecret!,
      logLevel: LogLevel.WARN,
    });
  }
}

/**
 * 긴 메시지를 Slack 제한(3000자)에 맞게 분할
 */
function splitSlackMessage(text: string, maxLength = 3000): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // 문단 경계에서 자르기 시도
    let cutAt = remaining.lastIndexOf("\n\n", maxLength);
    if (cutAt < maxLength * 0.5) {
      cutAt = remaining.lastIndexOf("\n", maxLength);
    }
    if (cutAt < maxLength * 0.5) {
      cutAt = maxLength;
    }

    chunks.push(remaining.substring(0, cutAt));
    remaining = remaining.substring(cutAt).trimStart();
  }

  return chunks;
}

/**
 * 메시지 처리 핵심 로직 (DM / 멘션 공통)
 */
async function processSlackMessage(params: {
  userId: string;
  text: string;
  say: (msg: string | object) => Promise<unknown>;
  showTyping?: () => Promise<void>;
}): Promise<void> {
  const { userId, text, say, showTyping } = params;
  const sessionKey = slackUserId(userId);
  const utterance = text.trim();

  if (!utterance) return;

  // /pair 명령어 - 인증 전에도 처리
  if (utterance.toLowerCase().startsWith("/pair")) {
    const parts = utterance.split(/\s+/);
    const code = parts[1];
    const name = parts.slice(2).join(" ") || undefined;

    if (!code) {
      await say(
        "📝 *Pairing 사용법*\n\n`/pair [인증코드] [이름]`\n\n예시:\n• `/pair myCode`\n• `/pair myCode 홍길동`"
      );
      return;
    }

    const result = verifyPairingCode(sessionKey, code, name);
    await say(result.success ? result.message : `❌ ${result.message}`);
    return;
  }

  // 인증 확인
  if (!isUserVerified(sessionKey)) {
    await say(
      "🔐 *인증이 필요합니다.*\n\n`/pair [인증코드]` 또는 `/pair [인증코드] [이름]`을 입력해주세요."
    );
    return;
  }

  // 슬래시 명령어 처리
  if (isCommand(utterance)) {
    if (showTyping) await showTyping();
    const commandResult = await handleCommand(utterance, sessionKey);
    if (commandResult.handled && commandResult.response) {
      await say(commandResult.response);
      return;
    }
  }

  // AI 응답 처리
  if (showTyping) await showTyping();

  addConversationMessage(sessionKey, "user", utterance);
  const history = getConversationHistory(sessionKey);

  const response = await askClawdbot(utterance, sessionKey, history);
  addConversationMessage(sessionKey, "assistant", response.text);

  // 긴 메시지 분할 전송
  const chunks = splitSlackMessage(response.text);
  for (const chunk of chunks) {
    await say(chunk);
  }
}

/**
 * Slack 서버 시작
 */
export async function startSlackServer(): Promise<void> {
  if (!config.slack.botToken) {
    logger.info("Slack bot token not configured. Skipping Slack server.");
    return;
  }

  const app = createSlackApp();

  // DM 메시지 처리
  app.message(async ({ message, say, client }) => {
    const msg = message as any;
    if (msg.bot_id || msg.subtype) return; // 봇 메시지 무시

    const userId = msg.user;
    const text = msg.text || "";

    logger.info(`Slack DM from ${userId}: "${text.substring(0, 50)}"`);

    try {
      await processSlackMessage({
        userId,
        text,
        say: (msg) => say(msg as any),
        showTyping: async () => {
          try {
            await client.conversations.mark({
              channel: msg.channel,
              ts: msg.ts,
            });
          } catch {}
        },
      });
    } catch (error) {
      logger.error(`Slack message handling error: ${error}`);
      await say("죄송합니다. 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  });

  // 봇 @멘션 처리 (채널에서 @봇 으로 메시지 전송 시)
  app.event("app_mention", async ({ event, say, client }) => {
    const userId = event.user;
    // @봇명 부분 제거
    const text = (event.text || "").replace(/<@[A-Z0-9]+>/g, "").trim();

    logger.info(`Slack mention from ${userId}: "${text.substring(0, 50)}"`);

    try {
      await processSlackMessage({
        userId,
        text,
        say: (msg) =>
          say({
            text: typeof msg === "string" ? msg : JSON.stringify(msg),
            thread_ts: event.ts, // 멘션은 스레드로 답장
          } as any),
        showTyping: async () => {
          try {
            await client.reactions.add({
              channel: event.channel,
              timestamp: event.ts,
              name: "hourglass_flowing_sand",
            });
          } catch {}
        },
      });

      // 처리 완료 후 모래시계 이모지 제거
      try {
        await client.reactions.remove({
          channel: event.channel,
          timestamp: event.ts,
          name: "hourglass_flowing_sand",
        });
      } catch {}
    } catch (error) {
      logger.error(`Slack mention handling error: ${error}`);
      await say({
        text: "죄송합니다. 처리 중 오류가 발생했습니다.",
        thread_ts: event.ts,
      } as any);
    }
  });

  // 에러 핸들러
  app.error(async (error) => {
    logger.error(`Slack app error: ${error}`);
  });

  const socketMode = !!config.slack.appToken;
  if (socketMode) {
    await app.start();
    logger.info("🟢 Slack bot started (Socket Mode)");
    logger.info("  - DM the bot or @mention it in channels");
  } else {
    const slackPort = config.slack.port || 3001;
    await app.start(slackPort);
    logger.info(`🟢 Slack bot started (HTTP Mode) on port ${slackPort}`);
  }
}
