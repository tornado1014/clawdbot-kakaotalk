/**
 * 카카오 스킬 서버 (Webhook)
 * Express.js 기반 POST /skill 엔드포인트
 */

import express, { Request, Response, NextFunction } from "express";
import { KakaoSkillRequest, KakaoSkillResponse } from "./types";
import {
  createImmediateResponse,
  createTextResponse,
  sendCallback,
  sendErrorCallback,
} from "./kakao-api";
import {
  isUserVerified,
  verifyPairingCode,
  addConversationMessage,
  getConversationHistory,
  clearConversationHistory,
  getSessionStats,
} from "./session-manager";
import { askClawdbot, handleSpecialCommand } from "./clawdbot-bridge";
import { config } from "./config";
import { logger } from "./logger";

const app = express();

// JSON 파싱
app.use(express.json({ limit: "10mb" }));

// 요청 로깅
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

/**
 * 헬스체크 엔드포인트
 */
app.get("/health", (_req: Request, res: Response) => {
  const stats = getSessionStats();
  res.json({
    status: "ok",
    uptime: process.uptime(),
    sessions: stats,
  });
});

/**
 * 카카오 스킬 엔드포인트
 */
app.post("/skill", async (req: Request, res: Response) => {
  try {
    const skillRequest = req.body as KakaoSkillRequest;
    logger.info(`Full request: ${JSON.stringify(skillRequest, null, 2)}`);
    
    const { userRequest } = skillRequest;
    const { utterance, user, callbackUrl } = userRequest;
    const kakaoId = user.properties?.botUserKey || user.id;

    logger.info(`Received message from ${kakaoId}: "${utterance}"`);

    // 콜백 URL 있으면 비동기 처리
    if (callbackUrl) {
      res.json(createImmediateResponse("🦞 생각 중..."));
      processMessageAsync(kakaoId, utterance, callbackUrl);
      return;
    }

    // 콜백 없으면 직접 응답 (5초 제한)
    const response = await handleWithoutCallback(kakaoId, utterance);
    return res.json(response);
  } catch (error) {
    logger.error(`Skill endpoint error: ${error}`);
    res.status(500).json(createTextResponse("서버 오류가 발생했습니다."));
  }
});

/**
 * 콜백 없이 즉시 응답 (단순 스킬용)
 */
async function handleWithoutCallback(
  kakaoId: string,
  utterance: string
): Promise<KakaoSkillResponse> {
  // Pairing 명령어는 인증 전에도 처리
  if (utterance.toLowerCase().startsWith("/pair")) {
    const parts = utterance.split(/\s+/);
    const code = parts[1];
    const name = parts.slice(2).join(" ") || undefined;

    if (!code) {
      return createTextResponse(
        `📝 Pairing 사용법\n\n/pair [인증코드] [이름]\n\n예시:\n/pair myCode\n/pair myCode 홍길동`
      );
    }

    const result = verifyPairingCode(kakaoId, code, name);
    return createTextResponse(result.success ? result.message : `❌ ${result.message}`);
  }

  // 인증 확인
  if (!isUserVerified(kakaoId)) {
    return createTextResponse(
      `🔐 인증이 필요합니다.\n\n"/pair [인증코드]" 또는 "/pair [인증코드] [이름]"을 입력해주세요.`
    );
  }

  // 특수 명령어 처리
  const specialResult = handleSpecialCommand(utterance);
  if (specialResult.handled && specialResult.response) {
    return createTextResponse(specialResult.response);
  }

  // /clear 명령어
  if (utterance.toLowerCase() === "/clear" || utterance === "대화 초기화") {
    clearConversationHistory(kakaoId);
    return createTextResponse("✅ 대화 기록이 초기화되었습니다.");
  }

  // 콜백 없이도 AI 응답 처리 (동기식, 5초 제한 주의)
  try {
    addConversationMessage(kakaoId, "user", utterance);
    const history = getConversationHistory(kakaoId);
    const response = await askClawdbot(utterance, kakaoId, history);
    addConversationMessage(kakaoId, "assistant", response.text);
    return createTextResponse(response.text);
  } catch (error) {
    logger.error(`Sync AI processing error: ${error}`);
    return createTextResponse("AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
}

/**
 * 비동기 메시지 처리 (콜백 사용)
 */
async function processMessageAsync(
  kakaoId: string,
  utterance: string,
  callbackUrl: string
): Promise<void> {
  try {
    // Pairing 명령어 처리
    if (utterance.toLowerCase().startsWith("/pair")) {
      await handlePairingCommand(kakaoId, utterance, callbackUrl);
      return;
    }

    // 인증 확인
    if (!isUserVerified(kakaoId)) {
      await sendCallback(
        callbackUrl,
        `🔐 인증이 필요합니다.\n\n"/pair [인증코드]"를 입력해주세요.\n예: /pair mySecretCode 홍길동`,
        {
          quickReplies: [{ label: "인증 방법", message: "/help pair" }],
        }
      );
      return;
    }

    // 특수 명령어 처리
    const specialResult = handleSpecialCommand(utterance);
    if (specialResult.handled && specialResult.response) {
      await sendCallback(callbackUrl, specialResult.response);
      return;
    }

    // /clear 명령어
    if (utterance.toLowerCase() === "/clear" || utterance === "대화 초기화") {
      clearConversationHistory(kakaoId);
      await sendCallback(callbackUrl, "✅ 대화 기록이 초기화되었습니다.", {
        quickReplies: [{ label: "새 대화 시작", message: "안녕하세요" }],
      });
      return;
    }

    // 대화 기록에 사용자 메시지 추가
    addConversationMessage(kakaoId, "user", utterance);

    // Clawdbot으로 처리
    const history = getConversationHistory(kakaoId);
    const response = await askClawdbot(utterance, kakaoId, history);

    // 대화 기록에 AI 응답 추가
    addConversationMessage(kakaoId, "assistant", response.text);

    // 콜백 전송
    await sendCallback(callbackUrl, response.text, {
      quickReplies: [
        { label: "계속", message: "계속해주세요" },
        { label: "새 주제", message: "/clear" },
      ],
    });
  } catch (error) {
    logger.error(`Async processing error: ${error}`);
    await sendErrorCallback(callbackUrl, "처리 중 오류가 발생했습니다.");
  }
}

/**
 * Pairing 명령어 처리
 */
async function handlePairingCommand(
  kakaoId: string,
  utterance: string,
  callbackUrl: string
): Promise<void> {
  // /pair [코드] [이름 (선택)]
  const parts = utterance.split(/\s+/);
  const code = parts[1];
  const name = parts.slice(2).join(" ") || undefined;

  if (!code) {
    await sendCallback(
      callbackUrl,
      `📝 Pairing 사용법\n\n/pair [인증코드] [이름]\n\n예시:\n/pair myCode\n/pair myCode 홍길동`
    );
    return;
  }

  const result = verifyPairingCode(kakaoId, code, name);

  if (result.success) {
    await sendCallback(callbackUrl, result.message, {
      quickReplies: [
        { label: "시작하기", message: "안녕하세요!" },
        { label: "도움말", message: "/help" },
      ],
    });
  } else {
    await sendCallback(callbackUrl, `❌ ${result.message}`);
  }
}

/**
 * 에러 핸들러
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json(createTextResponse("서버 오류가 발생했습니다."));
});

/**
 * 서버 시작
 */
export function startServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(config.port, config.host, () => {
      logger.info(`🦞 Clawdbot Kakao Server running on ${config.host}:${config.port}`);
      logger.info(`Webhook URL: http://localhost:${config.port}/skill`);
      resolve();
    });
  });
}

export { app };
