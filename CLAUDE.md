# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

카카오톡 채널을 통해 Clawdbot AI 어시스턴트와 대화할 수 있게 하는 웹훅 서버. 카카오 AI 챗봇 콜백 기능을 활용하여 5초 타임아웃을 우회하고 비동기로 AI 응답을 전송한다.

## Commands

```bash
# Development (auto-reload)
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint

# Test
npm test

# Tunnel (expose local server)
npm run tunnel
```

## Architecture

```
POST /skill (KakaoSkillRequest)
      │
      ├─ callbackUrl 없음 → 즉시 응답 (5초 제한)
      │
      └─ callbackUrl 있음 → 즉시 "생각 중..." 응답
                          │
                          └─ 비동기 처리 시작
                              ├─ SessionManager: 인증/세션 확인
                              ├─ ClawdbotBridge: AI 처리 (CLI/Gateway)
                              └─ KakaoAPI: 콜백 URL로 응답 전송
```

**핵심 모듈:**

- `webhook-server.ts` - Express 서버, `/skill` 엔드포인트 핸들러
- `kakao-api.ts` - 카카오 응답 포맷 생성, 콜백 전송, 긴 텍스트 분할 (1000자 제한)
- `session-manager.ts` - 메모리 기반 세션, pairing 인증, 대화 기록 관리 (최대 20개)
- `clawdbot-bridge.ts` - Clawdbot CLI 호출 (`clawdbot ask`), Gateway 모드 지원 예정
- `types.ts` - 카카오 스킬 API 타입 정의 (요청/응답/리치메시지)
- `config.ts` - 환경변수 로드, `data/allowed-users.json` 영속화

**인증 플로우:**

1. 새 사용자 → 인증 필요 응답
2. `/pair [코드] [이름]` 명령어로 pairing
3. `allowed-users.json`에 저장되어 서버 재시작 후에도 유지
4. 세션은 24시간 후 자동 만료

## Key Constraints

- 카카오 스킬 응답 5초 타임아웃 → `useCallback: true`로 즉시 응답 후 콜백 사용
- 카카오 텍스트 말풍선 1000자 제한 → `splitLongText()`로 분할, 최대 3개 말풍선
- Clawdbot CLI 타임아웃 2분

## Environment Variables

필수 설정:
- `PAIRING_CODE` - 사용자 인증 코드 (기본값 변경 필수)
- `CLAWDBOT_MODE` - `cli` 또는 `gateway`

## Docker

```bash
# 빌드 및 실행
docker-compose up -d

# Cloudflare Tunnel 토큰 필요
CLOUDFLARE_TUNNEL_TOKEN=... docker-compose up -d
```

## 현재 운영 상태

**PM2로 서버 관리 중:**
```powershell
npx pm2 list                    # 상태 확인
npx pm2 logs clawdbot-kakaotalk # 로그 보기
npx pm2 restart clawdbot-kakaotalk # 재시작
```

**Windows 시작 시 자동 실행:**
- VBS 스크립트 위치: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\start-pm2.vbs`
- PM2 resurrect로 저장된 프로세스 복구

**⚠️ 창 깜빡임 문제 해결:**
- `ecosystem.config.js`에 `windowsHide: true` 옵션 필수
- clawdbot-gateway도 ecosystem.config.js에 포함 (env에 `CLAWDBOT_NODE_OPTIONS_READY: '1'` 설정)
- **중요**: clawdbot 패키지 내부 spawn 호출에도 `windowsHide: true` 추가 필요:
  - `%APPDATA%/npm/node_modules/clawdbot/dist/entry.js` (31줄)
  - `%APPDATA%/npm/node_modules/clawdbot/dist/acp/client.js` (57줄)
- clawdbot 업데이트 시 위 파일들 다시 수정 필요
- 설정 변경 후: `npx pm2 delete all && npx pm2 start ecosystem.config.js && npx pm2 save`

**ngrok 터널:** `https://<your-subdomain>.ngrok-free.dev/skill`

## TODO: 고정 도메인 터널 설정

**현재 문제:** ngrok 무료 버전 사용 중 - 재시작 시 URL 변경됨

**해결 옵션:**
1. **ngrok Personal ($8/월)** - 고정 커스텀 도메인 1개 제공
2. **Cloudflare Tunnel (무료)** - 설정 복잡하지만 무료 고정 도메인

**작업 시 필요한 것:**
- 카카오 챗봇 스킬 URL 변경 필요 (새 고정 도메인으로)
- Windows 시작 시 터널 자동 실행 설정
- 현재 ngrok 세션 종료됨 → 잠시 서비스 중단

**Cloudflare Tunnel 설정 시 필요:**
1. Cloudflare 계정 생성
2. 도메인 등록 또는 Cloudflare 무료 도메인 사용
3. `cloudflared` 설치 및 터널 생성
4. Windows 서비스로 등록
