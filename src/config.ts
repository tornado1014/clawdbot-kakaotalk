import { config as dotenvConfig } from "dotenv";
import { ServerConfig, AllowedUser } from "./types";
import * as fs from "fs";
import * as path from "path";

// Load .env file
dotenvConfig();

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "allowed-users.json");

/**
 * 허용된 사용자 목록 로드
 */
function loadAllowedUsers(): AllowedUser[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn("Failed to load allowed users:", error);
  }
  return [];
}

/**
 * 허용된 사용자 목록 저장
 */
export function saveAllowedUsers(users: AllowedUser[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Failed to save allowed users:", error);
  }
}

/**
 * 서버 설정
 */
export const config: ServerConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || "0.0.0.0",

  kakao: {
    botId: process.env.KAKAO_BOT_ID || "",
    skillSecret: process.env.KAKAO_SKILL_SECRET,
  },

  clawdbot: {
    mode: (process.env.CLAWDBOT_MODE as "cli" | "gateway") || "gateway",
    gatewayUrl: process.env.CLAWDBOT_GATEWAY_URL || "http://localhost:18789",
    gatewayToken: process.env.CLAWDBOT_GATEWAY_TOKEN,
    model: process.env.CLAWDBOT_MODEL,
    systemPrompt: process.env.CLAWDBOT_SYSTEM_PROMPT || 
      "당신은 카카오톡을 통해 대화하는 AI 어시스턴트입니다. 한국어로 친근하게 대화해주세요.",
  },

  security: {
    pairingCode: process.env.PAIRING_CODE || "clawdbot2024",
    adminKakaoId: process.env.ADMIN_KAKAO_ID,
    allowedUsers: loadAllowedUsers(),
  },

  logging: {
    level: (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error") || "info",
  },
};

/**
 * 설정 유효성 검사
 */
export function validateConfig(): string[] {
  const errors: string[] = [];

  if (!config.security.pairingCode || config.security.pairingCode === "clawdbot2024") {
    errors.push("WARNING: Using default pairing code. Set PAIRING_CODE in .env");
  }

  return errors;
}
