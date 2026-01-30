const path = require('path');

// 프로젝트 루트 디렉토리 (이 파일이 위치한 곳)
const PROJECT_ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'clawdbot-kakaotalk',
      script: 'dist/index.js',
      cwd: PROJECT_ROOT,
      instances: 1,
      autorestart: true,
      watch: false,
      windowsHide: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // 재시작 설정
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
      // 로그 설정
      log_file: path.join(PROJECT_ROOT, 'logs/combined.log'),
      out_file: path.join(PROJECT_ROOT, 'logs/out.log'),
      error_file: path.join(PROJECT_ROOT, 'logs/error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'clawdbot-gateway',
      // clawdbot이 전역 설치된 경우: npx clawdbot gateway 사용
      // 또는 로컬 경로로 수정: process.env.APPDATA + '/npm/node_modules/clawdbot/dist/entry.js'
      script: 'npx',
      args: 'clawdbot gateway --port 18789',
      cwd: PROJECT_ROOT,
      instances: 1,
      autorestart: true,
      watch: false,
      windowsHide: true,
      env: {
        NODE_ENV: 'production',
        // 창 깜빡임 방지: spawn respawn 건너뛰기
        CLAWDBOT_NODE_OPTIONS_READY: '1',
        NODE_OPTIONS: '--disable-warning=ExperimentalWarning'
      },
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
