/**
 * 카카오 API 클라이언트
 * 콜백 응답 전송 및 리치 메시지 포맷 지원
 */

import fetch from "node-fetch";
import {
  KakaoSkillResponse,
  KakaoTemplate,
  KakaoOutput,
  KakaoQuickReply,
  KakaoBasicCard,
} from "./types";
import { logger } from "./logger";

/**
 * 즉시 응답 생성 (5초 타임아웃 우회용)
 */
export function createImmediateResponse(message: string = "🦞 생각 중..."): KakaoSkillResponse {
  return {
    version: "2.0",
    useCallback: true,
    data: {
      text: message,
    },
  };
}

/**
 * 단순 텍스트 응답 생성
 */
export function createTextResponse(text: string): KakaoSkillResponse {
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text } }],
    },
  };
}

/**
 * 버튼이 있는 카드 응답 생성
 */
export function createCardResponse(
  title: string,
  description: string,
  buttons?: { label: string; message: string }[]
): KakaoSkillResponse {
  const card: KakaoBasicCard = {
    title,
    description,
  };

  if (buttons && buttons.length > 0) {
    card.buttons = buttons.map((btn) => ({
      label: btn.label,
      action: "message" as const,
      messageText: btn.message,
    }));
  }

  return {
    version: "2.0",
    template: {
      outputs: [{ basicCard: card }],
    },
  };
}

/**
 * Quick Reply 추가
 */
export function addQuickReplies(
  response: KakaoSkillResponse,
  replies: { label: string; message: string }[]
): KakaoSkillResponse {
  if (!response.template) {
    return response;
  }

  response.template.quickReplies = replies.map((reply) => ({
    label: reply.label,
    action: "message" as const,
    messageText: reply.message,
  }));

  return response;
}

/**
 * 긴 텍스트를 여러 말풍선으로 분할
 * 카카오톡 텍스트 제한: 1000자
 */
export function splitLongText(text: string, maxLength: number = 900): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    // 문장 단위로 자르기 시도
    let cutIndex = remaining.lastIndexOf(". ", maxLength);
    if (cutIndex === -1 || cutIndex < maxLength / 2) {
      cutIndex = remaining.lastIndexOf("\n", maxLength);
    }
    if (cutIndex === -1 || cutIndex < maxLength / 2) {
      cutIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (cutIndex === -1 || cutIndex < maxLength / 2) {
      cutIndex = maxLength;
    }

    parts.push(remaining.substring(0, cutIndex + 1).trim());
    remaining = remaining.substring(cutIndex + 1).trim();
  }

  return parts;
}

/**
 * 콜백 URL로 응답 전송
 */
export async function sendCallback(
  callbackUrl: string,
  text: string,
  options?: {
    quickReplies?: { label: string; message: string }[];
  }
): Promise<boolean> {
  try {
    // 긴 텍스트 분할
    const textParts = splitLongText(text);
    const outputs: KakaoOutput[] = textParts.map((part) => ({
      simpleText: { text: part },
    }));

    // 최대 3개 말풍선만 허용
    if (outputs.length > 3) {
      const lastOutput = outputs[2];
      const lastText = "simpleText" in lastOutput ? lastOutput.simpleText.text : "";
      outputs.splice(3);
      outputs[2] = {
        simpleText: {
          text: lastText + "\n\n... (내용이 길어 일부 생략됨)",
        },
      };
    }

    const template: KakaoTemplate = { outputs };

    if (options?.quickReplies) {
      template.quickReplies = options.quickReplies.map((reply) => ({
        label: reply.label,
        action: "message" as const,
        messageText: reply.message,
      }));
    }

    const response: KakaoSkillResponse = {
      version: "2.0",
      template,
    };

    logger.debug(`Sending callback to: ${callbackUrl}`);
    logger.debug(`Payload: ${JSON.stringify(response)}`);

    const result = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    });

    if (!result.ok) {
      const errorText = await result.text();
      logger.error(`Callback failed: ${result.status} - ${errorText}`);
      return false;
    }

    logger.info(`Callback sent successfully to ${callbackUrl}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send callback: ${error}`);
    return false;
  }
}

/**
 * 에러 응답 전송
 */
export async function sendErrorCallback(
  callbackUrl: string,
  errorMessage: string = "죄송합니다. 처리 중 오류가 발생했습니다."
): Promise<boolean> {
  return sendCallback(callbackUrl, `❌ ${errorMessage}`, {
    quickReplies: [
      { label: "다시 시도", message: "다시 시도해주세요" },
      { label: "도움말", message: "/help" },
    ],
  });
}
