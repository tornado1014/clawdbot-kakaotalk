/**
 * Clawdbot × 카카오톡 통합 플러그인
 * 메인 엔트리 포인트
 */

import { startServer } from "./webhook-server";
import { config, validateConfig } from "./config";
import { logger } from "./logger";

/**
 * 배너 출력
 */
function printBanner(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🦞 Clawdbot × 카카오톡 통합 서버                        ║
║                                                           ║
║   카카오톡 채널을 통해 AI 어시스턴트와 대화하세요!        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
}

/**
 * 메인 함수
 */
async function main(): Promise<void> {
  printBanner();

  // 설정 유효성 검사
  const configWarnings = validateConfig();
  if (configWarnings.length > 0) {
    configWarnings.forEach((warning) => logger.warn(warning));
  }

  // 설정 정보 출력
  logger.info("Configuration:");
  logger.info(`  - Port: ${config.port}`);
  logger.info(`  - Host: ${config.host}`);
  logger.info(`  - Clawdbot Mode: ${config.clawdbot.mode}`);
  logger.info(`  - Allowed Users: ${config.security.allowedUsers.length}`);

  // 서버 시작
  await startServer();

  logger.info("");
  logger.info("📋 다음 단계:");
  logger.info("  1. Cloudflare Tunnel 또는 ngrok으로 서버 노출");
  logger.info("  2. 카카오 챗봇 관리자센터에서 스킬 서버 URL 등록");
  logger.info("  3. 카카오톡 채널에서 테스트 메시지 전송");
  logger.info("");
  logger.info("✅ 서버가 메시지를 기다리고 있습니다...");
}

// 프로세스 시그널 핸들링
process.on("SIGINT", () => {
  logger.info("Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down...");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  logger.error(`Uncaught exception: ${error}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

// 실행
main().catch((error) => {
  logger.error(`Failed to start: ${error}`);
  process.exit(1);
});

