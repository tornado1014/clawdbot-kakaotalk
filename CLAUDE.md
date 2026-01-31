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

---

## 세션 로그

### 2026-01-30: 문서화 및 GitHub 배포

**완료된 작업:**

1. **인터랙티브 학습 페이지 생성**
   - 파일: `clawdbot-kakaotalk-interactive-learning.html`
   - 프로젝트 구조, 아키텍처, 설치 가이드를 시각화한 단일 HTML 파일
   - GSAP 애니메이션, 코드 탭, 아코디언 등 인터랙티브 요소 포함

2. **사용자 가이드 문서 생성**
   - 파일: `docs/USER_GUIDE.md`
   - 10개 섹션으로 구성된 상세 설치/사용 가이드
   - 트러블슈팅, FAQ 포함

3. **GitHub 저장소 배포**
   - URL: https://github.com/tornado1014/clawdbot-kakaotalk
   - 민감 정보 제거 후 force push 완료
   - `.gitignore`에 바이너리 파일(ngrok, cloudflared) 추가

4. **PM2 Gateway 문제 해결**
   - **원인**: `exec_mode: 'fork'` 누락 → PM2가 cluster 모드로 실행 → gateway 크래시
   - **해결**: `ecosystem.config.js`에 `exec_mode: 'fork'` 추가
   - **교훈**: clawdbot gateway는 cluster 모드 호환 안됨

**ecosystem.config.js 주의사항:**
```javascript
// clawdbot-gateway는 반드시 fork 모드로 실행해야 함
{
  name: 'clawdbot-gateway',
  script: process.env.APPDATA + '/npm/node_modules/clawdbot/dist/entry.js',
  exec_mode: 'fork',  // 필수! cluster 모드에서 크래시됨
  // ...
}
```

**PM2 재시작 명령 (PowerShell에서 실행):**
```powershell
Set-Location 'D:\Work_with_ClaudeD\clawdbot-kakaotalk'
npx pm2 delete all
npx pm2 start ecosystem.config.js
npx pm2 save
```

⚠️ **Git Bash에서 PM2 명령 문제**: PATH 문제로 `npx pm2`가 제대로 작동하지 않을 수 있음. **PowerShell 사용 권장**.

**다음 세션 TODO:**
- [ ] 고정 도메인 터널 설정 (ngrok paid 또는 Cloudflare)

### 2026-01-31: 모델 오류 및 창 깜빡임 해결

**문제 1: Gateway 모델 오류**
```
⚠️ Agent failed before reply: Unknown model: anthropic/claude-sonnet-4
```

**원인:** `/model sonnet` 명령어로 모델 변경 시 잘못된 모델명 저장됨
- ❌ `anthropic/claude-sonnet-4` (버전 누락)
- ✅ `anthropic/claude-opus-4-5-20251101` (정확한 형식)

**해결:**
1. `~/.clawdbot/clawdbot.json`에서 모델명 수정
2. `~/.clawdbot/agents/main` 폴더 삭제 (세션 캐시)
3. 오래된 Gateway 프로세스(PM2 외부) 종료: `taskkill /F /PID <old_pid>`
4. Gateway 재시작

**문제 2: 창 깜빡임 (터미널 창이 주기적으로 깜빡임)**

**진단 과정:**
1. PM2 전체 중지 → 깜빡임 멈춤 → clawdbot 관련 확인
2. clawdbot-kakaotalk만 시작 → 정상
3. clawdbot-gateway 시작 → 깜빡임 시작 → gateway가 원인

**원인:** Bonjour (mDNS) 서비스가 이름 충돌 해결 과정에서 subprocess 생성
```
[bonjour] gateway name conflict resolved; newName="DESKTOP-UL3CAOB (Clawdbot) (2)"
```

**해결:** `ecosystem.config.js`에 Bonjour 비활성화 환경변수 추가
```javascript
env: {
  // ... 기존 설정
  CLAWDBOT_DISABLE_BONJOUR: '1'  // 창 깜빡임 방지
}
```

**추가 설정 (clawdbot.json):**
```json
{
  "web": { "enabled": false }  // Control UI 비활성화 (선택)
}
```

**커밋된 변경사항:**
1. `ecosystem.config.js` - exec_mode fork, Bonjour 비활성화
2. `src/command-handler.ts` - 슬래시 명령어 핸들러 분리 (신규)
3. `src/clawdbot-bridge.ts` - 타임아웃 90초, 에러 메시지 개선
4. `src/webhook-server.ts` - command-handler 연동

**⚠️ 창 깜빡임 체크리스트:**
- [ ] `ecosystem.config.js`에 `windowsHide: true`
- [ ] `ecosystem.config.js`에 `CLAWDBOT_NODE_OPTIONS_READY: '1'`
- [ ] `ecosystem.config.js`에 `CLAWDBOT_DISABLE_BONJOUR: '1'`
- [ ] 예약 작업 비활성화: `schtasks /Change /TN "Clawdbot Gateway" /Disable`
- [ ] clawdbot 패키지 내부 spawn에 `windowsHide: true` (업데이트 시 재확인)
