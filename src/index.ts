/**
 * Clawdbot × 카카오톡 통합 플러그인
 * 메인 엔트리 포인트
 */

import { startServer } from "./webhook-server";
import { startSlackServer } from "./slack-server";
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

  // 카카오 서버 시작
  await startServer();

  // Slack 서버 시작 (설정된 경우)
  await startSlackServer();

  logger.info("");
  logger.info("📋 다음 단계:");
  logger.info("  [카카오] Cloudflare Tunnel 또는 ngrok으로 서버 노출 후 스킬 URL 등록");
  if (config.slack.botToken) {
    logger.info("  [Slack] 봇이 워크스페이스에 설치되어 있으면 준비 완료!");
  } else {
    logger.info("  [Slack] SLACK_BOT_TOKEN, SLACK_APP_TOKEN 설정 후 재시작");
  }
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
