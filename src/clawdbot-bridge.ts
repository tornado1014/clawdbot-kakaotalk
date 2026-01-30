/**
 * Clawdbot 브릿지
 * Gateway HTTP API를 통해 Clawdbot과 통신
 */

import fetch from "node-fetch";
import { ClawdbotResponse, ConversationMessage } from "./types";
import { config } from "./config";
import { logger } from "./logger";

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  model?: string;
  messages: ChatCompletionMessage[];
  stream?: boolean;
  max_tokens?: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Clawdbot Gateway HTTP API로 메시지 전송
 */
async function askClawdbotGateway(
  message: string,
  sessionKey: string,
  conversationHistory: ConversationMessage[]
): Promise<ClawdbotResponse> {
  const startTime = Date.now();

  try {
    // 메시지 배열 구성
    const messages: ChatCompletionMessage[] = [];

    // 시스템 프롬프트
    if (config.clawdbot.systemPrompt) {
      messages.push({
        role: "system",
        content: config.clawdbot.systemPrompt,
      });
    }

    // 대화 히스토리 (최근 10개)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // 현재 메시지
    messages.push({
      role: "user",
      content: message,
    });

    const requestBody: ChatCompletionRequest = {
      messages,
      stream: false,
    };

    if (config.clawdbot.model) {
      requestBody.model = config.clawdbot.model;
    }

    const apiUrl = `${config.clawdbot.gatewayUrl}/v1/chat/completions`;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.clawdbot.gatewayToken) {
      headers["Authorization"] = `Bearer ${config.clawdbot.gatewayToken}`;
    }

    logger.debug(`Sending request to: ${apiUrl}`);
    logger.debug(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      timeout: 120000, // 2분 타임아웃
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Gateway API error: ${response.status} - ${errorText}`);
      throw new Error(`Gateway API error: ${response.status}`);
    }

    const result = (await response.json()) as ChatCompletionResponse;
    const processingTime = Date.now() - startTime;

    logger.info(`Clawdbot responded in ${processingTime}ms`);
    logger.debug(`Response: ${JSON.stringify(result, null, 2)}`);

    const responseText = result.choices[0]?.message?.content || "응답을 받지 못했습니다.";

    return {
      text: responseText,
      metadata: {
        processingTime,
      },
    };
  } catch (error) {
    logger.error(`Clawdbot Gateway error: ${error}`);
    throw error;
  }
}

/**
 * Clawdbot에 메시지 전송 (통합 인터페이스)
 */
export async function askClawdbot(
  message: string,
  sessionKey: string,
  conversationHistory: ConversationMessage[] = []
): Promise<ClawdbotResponse> {
  logger.info(`Processing message for session ${sessionKey}: "${message.substring(0, 50)}..."`);

  try {
    return await askClawdbotGateway(message, sessionKey, conversationHistory);
  } catch (error) {
    logger.error(`Failed to get Clawdbot response: ${error}`);

    // 폴백 응답
    return {
      text: "죄송합니다. AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      metadata: {
        toolsUsed: [],
        processingTime: 0,
      },
    };
  }
}

/**
 * 특수 명령어 처리
 */
export function handleSpecialCommand(
  command: string
): { handled: boolean; response?: string } {
  const cmd = command.toLowerCase().trim();

  // /help 명령어
  if (cmd === "/help" || cmd === "도움말") {
    return {
      handled: true,
      response: `🦞 Clawdbot 도움말

**기본 명령어**
• /help - 도움말 표시
• /clear - 대화 기록 초기화
• /status - 시스템 상태 확인

**사용 방법**
자유롭게 질문하시면 AI가 답변해드립니다!

예시:
• "오늘 할 일 정리해줘"
• "이메일 초안 작성해줘"
• "코드 리뷰 부탁해"`,
    };
  }

  // /status 명령어
  if (cmd === "/status" || cmd === "상태") {
    return {
      handled: true,
      response: `🦞 Clawdbot 상태

✅ 서버: 정상
✅ AI: 연결됨
📍 Gateway: ${config.clawdbot.gatewayUrl}
🤖 모델: ${config.clawdbot.model || "기본값"}`,
    };
  }

  return { handled: false };
}

/**
 * Gateway 연결 상태 확인
 */
export async function checkGatewayHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${config.clawdbot.gatewayUrl}/health`, {
      method: "GET",
      timeout: 5000,
    });
    return response.ok;
  } catch {
    return false;
  }
}
