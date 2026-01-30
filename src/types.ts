/**
 * 카카오 챗봇 API 타입 정의
 * @see https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/ai_chatbot_callback_guide
 */

// ============ 카카오 요청 타입 ============

export interface KakaoSkillRequest {
  intent: {
    id: string;
    name: string;
  };
  userRequest: {
    timezone: string;
    params: {
      ignoreMe: string;
      surface: string;
    };
    block: {
      id: string;
      name: string;
    };
    utterance: string;
    lang: string;
    user: KakaoUser;
    callbackUrl?: string; // AI 챗봇 콜백 URL
  };
  bot: {
    id: string;
    name: string;
  };
  action: {
    name: string;
    clientExtra: Record<string, unknown>;
    params: Record<string, string>;
    id: string;
    detailParams: Record<string, { origin: string; value: string; groupName: string }>;
  };
}

export interface KakaoUser {
  id: string;
  type: string;
  properties: {
    botUserKey: string;
    bot_user_key?: string;
    plusfriendUserKey?: string;
    plusfriend_user_key?: string;
    appUserId?: string;
    app_user_id?: string;
    isFriend?: boolean;
    is_friend?: boolean;
  };
}

// ============ 카카오 응답 타입 ============

export interface KakaoSkillResponse {
  version: "2.0";
  useCallback?: boolean;
  data?: {
    text?: string;
    [key: string]: unknown;
  };
  template?: KakaoTemplate;
}

export interface KakaoTemplate {
  outputs: KakaoOutput[];
  quickReplies?: KakaoQuickReply[];
}

export type KakaoOutput =
  | { simpleText: { text: string } }
  | { simpleImage: { imageUrl: string; altText: string } }
  | { basicCard: KakaoBasicCard }
  | { listCard: KakaoListCard }
  | { carousel: KakaoCarousel };

export interface KakaoBasicCard {
  title?: string;
  description?: string;
  thumbnail?: {
    imageUrl: string;
    link?: { web: string };
    fixedRatio?: boolean;
    width?: number;
    height?: number;
  };
  profile?: {
    nickname: string;
    imageUrl?: string;
  };
  buttons?: KakaoButton[];
}

export interface KakaoListCard {
  header: {
    title: string;
    imageUrl?: string;
    action?: KakaoAction;
  };
  items: {
    title: string;
    description?: string;
    imageUrl?: string;
    action?: KakaoAction;
  }[];
  buttons?: KakaoButton[];
}

export interface KakaoCarousel {
  type: "basicCard" | "commerceCard" | "listCard";
  items: (KakaoBasicCard | KakaoListCard)[];
}

export interface KakaoButton {
  label: string;
  action: "webLink" | "message" | "block" | "phone" | "share";
  webLinkUrl?: string;
  messageText?: string;
  blockId?: string;
  phoneNumber?: string;
}

export interface KakaoQuickReply {
  label: string;
  action: "message" | "block";
  messageText?: string;
  blockId?: string;
}

export interface KakaoAction {
  type: "webLink" | "message" | "block" | "phone";
  webLinkUrl?: string;
  messageText?: string;
  blockId?: string;
  phoneNumber?: string;
}

// ============ 내부 타입 ============

export interface UserSession {
  kakaoId: string;
  name?: string;
  isVerified: boolean;
  pairingAttempts: number;
  lastActive: Date;
  conversationHistory: ConversationMessage[];
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ClawdbotResponse {
  text: string;
  metadata?: {
    toolsUsed?: string[];
    processingTime?: number;
  };
}

export interface ServerConfig {
  port: number;
  host: string;
  kakao: {
    botId: string;
    skillSecret?: string;
  };
  clawdbot: {
    mode: "cli" | "gateway";
    gatewayUrl: string;
    gatewayToken?: string;
    model?: string;
    systemPrompt?: string;
  };
  security: {
    pairingCode: string;
    adminKakaoId?: string;
    allowedUsers: AllowedUser[];
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
  };
}

export interface AllowedUser {
  kakaoId: string;
  name: string;
  addedAt: Date;
}
