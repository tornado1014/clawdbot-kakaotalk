/**
 * 사용자 세션 관리
 * Pairing 인증, 멀티유저 세션 격리
 */

import { v4 as uuidv4 } from "uuid";
import { UserSession, AllowedUser, ConversationMessage } from "./types";
import { config, saveAllowedUsers } from "./config";
import { logger } from "./logger";

// 메모리 기반 세션 저장소
const sessions = new Map<string, UserSession>();

// 세션 유지 시간 (24시간)
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// 대화 기록 최대 개수
const MAX_CONVERSATION_HISTORY = 20;

/**
 * 세션 조회 또는 생성
 */
export function getOrCreateSession(kakaoId: string): UserSession {
  let session = sessions.get(kakaoId);

  if (!session) {
    const allowedUser = config.security.allowedUsers.find((u) => u.kakaoId === kakaoId);

    session = {
      kakaoId,
      name: allowedUser?.name,
      isVerified: !!allowedUser || kakaoId === config.security.adminKakaoId,
      pairingAttempts: 0,
      lastActive: new Date(),
      conversationHistory: [],
    };

    sessions.set(kakaoId, session);
    logger.info(`New session created for ${kakaoId} (verified: ${session.isVerified})`);
  }

  session.lastActive = new Date();
  return session;
}

/**
 * 사용자 인증 여부 확인
 */
export function isUserVerified(kakaoId: string): boolean {
  const session = getOrCreateSession(kakaoId);
  return session.isVerified;
}

/**
 * Pairing 코드 검증
 */
export function verifyPairingCode(
  kakaoId: string,
  code: string,
  userName?: string
): { success: boolean; message: string } {
  const session = getOrCreateSession(kakaoId);

  // 이미 인증됨
  if (session.isVerified) {
    return { success: true, message: "이미 인증된 사용자입니다." };
  }

  // 시도 횟수 제한 (5회)
  if (session.pairingAttempts >= 5) {
    logger.warn(`Too many pairing attempts for ${kakaoId}`);
    return {
      success: false,
      message: "인증 시도 횟수를 초과했습니다. 나중에 다시 시도해주세요.",
    };
  }

  session.pairingAttempts++;

  // 코드 검증
  if (code !== config.security.pairingCode) {
    logger.warn(`Invalid pairing code attempt for ${kakaoId}`);
    return {
      success: false,
      message: `인증 코드가 일치하지 않습니다. (${5 - session.pairingAttempts}회 남음)`,
    };
  }

  // 인증 성공
  session.isVerified = true;
  session.name = userName || `User_${kakaoId.substring(0, 6)}`;
  session.pairingAttempts = 0;

  // 허용 목록에 추가
  const newUser: AllowedUser = {
    kakaoId,
    name: session.name,
    addedAt: new Date(),
  };
  config.security.allowedUsers.push(newUser);
  saveAllowedUsers(config.security.allowedUsers);

  logger.info(`User ${kakaoId} successfully paired as "${session.name}"`);

  return {
    success: true,
    message: `🎉 인증 완료! 안녕하세요, ${session.name}님. 이제 Clawdbot을 사용할 수 있습니다.`,
  };
}

/**
 * 대화 기록 추가
 */
export function addConversationMessage(
  kakaoId: string,
  role: "user" | "assistant",
  content: string
): void {
  const session = getOrCreateSession(kakaoId);

  session.conversationHistory.push({
    role,
    content,
    timestamp: new Date(),
  });

  // 최대 개수 유지
  if (session.conversationHistory.length > MAX_CONVERSATION_HISTORY) {
    session.conversationHistory.shift();
  }
}

/**
 * 대화 기록 조회
 */
export function getConversationHistory(kakaoId: string): ConversationMessage[] {
  const session = getOrCreateSession(kakaoId);
  return session.conversationHistory;
}

/**
 * 대화 기록 초기화
 */
export function clearConversationHistory(kakaoId: string): void {
  const session = getOrCreateSession(kakaoId);
  session.conversationHistory = [];
  logger.info(`Conversation history cleared for ${kakaoId}`);
}

/**
 * 만료된 세션 정리 (주기적 호출)
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [kakaoId, session] of sessions) {
    if (now - session.lastActive.getTime() > SESSION_TTL_MS) {
      sessions.delete(kakaoId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired sessions`);
  }

  return cleaned;
}

/**
 * 세션 통계
 */
export function getSessionStats(): {
  totalSessions: number;
  verifiedUsers: number;
  activeInLastHour: number;
} {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  let verifiedUsers = 0;
  let activeInLastHour = 0;

  for (const session of sessions.values()) {
    if (session.isVerified) verifiedUsers++;
    if (session.lastActive.getTime() > oneHourAgo) activeInLastHour++;
  }

  return {
    totalSessions: sessions.size,
    verifiedUsers,
    activeInLastHour,
  };
}

// 주기적 세션 정리 (1시간마다)
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
