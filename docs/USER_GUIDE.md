# 🦞 Clawdbot × 카카오톡 사용자 가이드

카카오톡 채널에서 AI 어시스턴트와 대화할 수 있게 해주는 완벽한 설치 및 사용 가이드입니다.

---

## 📋 목차

1. [시작하기 전에](#1-시작하기-전에)
2. [설치하기](#2-설치하기)
3. [환경 설정](#3-환경-설정)
4. [서버 실행](#4-서버-실행)
5. [터널 설정](#5-터널-설정)
6. [카카오 챗봇 설정](#6-카카오-챗봇-설정)
7. [사용법](#7-사용법)
8. [PM2로 서버 관리](#8-pm2로-서버-관리)
9. [트러블슈팅](#9-트러블슈팅)
10. [FAQ](#10-faq)

---

## 1. 시작하기 전에

### 필수 요구사항

| 항목 | 버전 | 확인 방법 |
|------|------|-----------|
| Node.js | 18.0.0 이상 | `node --version` |
| npm | 8.0.0 이상 | `npm --version` |
| Clawdbot | 최신 버전 | `clawdbot --version` |

### 필요한 계정

- [x] 카카오 비즈니스 계정 (https://business.kakao.com)
- [x] 카카오톡 채널 (무료 개설 가능)
- [x] ngrok 계정 또는 Cloudflare 계정 (터널용)

### 시스템 구성도

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   카카오톡      │ ───▶ │  Webhook Server  │ ───▶ │   Clawdbot      │
│   (사용자)      │ ◀─── │  (Express.js)    │ ◀─── │   Gateway       │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                        │
        │                        │
        ▼                        ▼
  카카오 서버              ngrok/Cloudflare
  (스킬 요청)              (HTTPS 터널)
```

---

## 2. 설치하기

### Step 1: 프로젝트 다운로드

```bash
# Git으로 클론 (또는 ZIP 다운로드)
git clone <repository-url> clawdbot-kakaotalk
cd clawdbot-kakaotalk
```

### Step 2: 의존성 설치

```bash
npm install
```

설치되는 주요 패키지:
- `express` - HTTP 서버
- `node-fetch` - API 요청
- `winston` - 로깅
- `uuid` - 세션 ID 생성
- `dotenv` - 환경 변수 관리

### Step 3: TypeScript 빌드

```bash
npm run build
```

> 📁 빌드 결과물은 `dist/` 폴더에 생성됩니다.

---

## 3. 환경 설정

### Step 1: 환경 변수 파일 생성

```bash
cp .env.example .env
```

### Step 2: .env 파일 수정

텍스트 에디터로 `.env` 파일을 열고 아래 값들을 설정합니다:

```env
# ═══════════════════════════════════════════
# 서버 설정
# ═══════════════════════════════════════════
PORT=3000                    # 서버 포트 (기본값 권장)
HOST=0.0.0.0                 # 모든 IP에서 접근 허용

# ═══════════════════════════════════════════
# Clawdbot 설정
# ═══════════════════════════════════════════
CLAWDBOT_MODE=gateway        # gateway 모드 사용
CLAWDBOT_GATEWAY_URL=http://localhost:18789
CLAWDBOT_GATEWAY_TOKEN=      # Gateway 토큰 (설정한 경우)
CLAWDBOT_MODEL=              # 특정 모델 지정 (선택)
CLAWDBOT_SYSTEM_PROMPT=당신은 카카오톡을 통해 대화하는 AI 어시스턴트입니다.

# ═══════════════════════════════════════════
# 🔐 보안 설정 (반드시 변경!)
# ═══════════════════════════════════════════
PAIRING_CODE=여기에_복잡한_코드_입력    # 사용자 인증 코드
ADMIN_KAKAO_ID=                         # 관리자 카카오 ID (선택)

# ═══════════════════════════════════════════
# 로깅
# ═══════════════════════════════════════════
LOG_LEVEL=info               # debug, info, warn, error
```

### ⚠️ 중요: PAIRING_CODE 설정

```bash
# 안전한 랜덤 코드 생성 예시
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

출력 예: `a3f8d2e1b4c5a6f7e8d9c0b1a2f3e4d5`

이 값을 `PAIRING_CODE`에 설정하세요.

---

## 4. 서버 실행

### 개발 모드 (자동 재시작)

```bash
npm run dev
```

실행 시 출력:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🦞 Clawdbot × 카카오톡 통합 서버                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

2024-01-28 12:00:00 [info] Configuration:
2024-01-28 12:00:00 [info]   - Port: 3000
2024-01-28 12:00:00 [info]   - Host: 0.0.0.0
2024-01-28 12:00:00 [info]   - Clawdbot Mode: gateway
2024-01-28 12:00:00 [info] 🦞 Clawdbot Kakao Server running on 0.0.0.0:3000
```

### 프로덕션 모드

```bash
# 빌드 후 실행
npm run build
npm start
```

### 서버 상태 확인

브라우저에서 `http://localhost:3000/health` 접속:

```json
{
  "status": "ok",
  "uptime": 123.456,
  "sessions": {
    "totalSessions": 2,
    "verifiedUsers": 1,
    "activeInLastHour": 1
  }
}
```

---

## 5. 터널 설정

카카오 서버가 로컬 서버에 접근하려면 HTTPS 터널이 필요합니다.

### 옵션 A: ngrok (추천 - 간단)

#### 1. ngrok 설치

```bash
# Windows (winget)
winget install ngrok

# macOS (Homebrew)
brew install ngrok

# 또는 https://ngrok.com/download 에서 다운로드
```

#### 2. 인증 토큰 설정

```bash
# https://dashboard.ngrok.com/get-started/your-authtoken 에서 토큰 확인
ngrok config add-authtoken <your-token>
```

#### 3. 터널 시작

```bash
ngrok http 3000
```

출력 예:
```
Forwarding    https://abc123.ngrok-free.dev -> http://localhost:3000
```

> 📝 `https://abc123.ngrok-free.dev` 주소를 메모하세요!

### 옵션 B: Cloudflare Tunnel (무료 고정 도메인)

#### 1. cloudflared 설치

```bash
# Windows
winget install cloudflare.cloudflared

# macOS
brew install cloudflared
```

#### 2. 터널 생성

```bash
cloudflared tunnel login
cloudflared tunnel create kakaotalk-bot
```

#### 3. 터널 실행

```bash
cloudflared tunnel run --url http://localhost:3000 kakaotalk-bot
```

---

## 6. 카카오 챗봇 설정

### Step 1: 카카오 채널 개설

1. [카카오 채널 관리자센터](https://center-pf.kakao.com) 접속
2. **새 채널 만들기** 클릭
3. 채널 정보 입력 (이름, 프로필 등)
4. 채널 개설 완료

### Step 2: 챗봇 생성

1. [카카오 챗봇 관리자센터](https://chatbot.kakao.com) 접속
2. **봇 만들기** 클릭
3. 봇 이름 입력 (예: "Clawdbot")
4. 앞서 만든 채널과 연결

### Step 3: ⭐ AI 챗봇 콜백 기능 신청

> 🚨 **매우 중요!** 이 기능 없이는 5초 타임아웃으로 AI 응답을 받을 수 없습니다.

1. 챗봇 관리자센터 → **설정** → **AI 챗봇**
2. **AI 챗봇 콜백 기능 신청** 클릭
3. 사용 목적 작성 후 신청
4. 승인 대기 (1-2일 소요)

### Step 4: 스킬 서버 등록

1. **스킬** 메뉴 클릭
2. **스킬 생성** 클릭
3. 스킬 정보 입력:
   - **스킬명**: Clawdbot 대화
   - **설명**: AI 어시스턴트 대화 처리
   - **URL**: `https://your-tunnel-domain.ngrok-free.dev/skill`

### Step 5: 시나리오 설정

1. **시나리오** 메뉴 클릭
2. **폴백 블록** 선택 (또는 새 블록 생성)
3. **스킬 데이터 사용** 체크
4. 앞서 만든 스킬 선택
5. **저장** 후 **배포**

### Step 6: 테스트

1. 카카오톡에서 채널 검색
2. 채널 친구 추가
3. 메시지 전송 테스트

---

## 7. 사용법

### 첫 인증 (Pairing)

카카오톡 채널에서 다음 메시지를 전송합니다:

```
/pair [인증코드] [이름]
```

**예시:**
```
/pair a3f8d2e1b4c5a6f7e8d9c0b1a2f3e4d5 홍길동
```

**성공 응답:**
```
🎉 인증 완료! 안녕하세요, 홍길동님. 이제 Clawdbot을 사용할 수 있습니다.
```

### 기본 명령어

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `/help` | 도움말 표시 | `/help` |
| `/clear` | 대화 기록 초기화 | `/clear` |
| `/status` | 시스템 상태 확인 | `/status` |
| `/pair` | 사용자 인증 | `/pair myCode 홍길동` |

### 일반 대화

인증 후에는 자유롭게 대화할 수 있습니다:

```
안녕하세요!
→ 안녕하세요! 무엇을 도와드릴까요?

오늘 할 일 정리해줘
→ 네, 오늘 할 일 목록을 정리해드릴게요...

이메일 초안 작성해줘
→ 어떤 내용의 이메일을 작성해드릴까요?
```

### 대화 컨텍스트

봇은 최대 20개의 이전 대화를 기억합니다:

```
사용자: 내 이름은 민수야
봇: 안녕하세요, 민수님!

사용자: 내 이름이 뭐라고 했지?
봇: 민수님이라고 하셨어요.
```

대화 기록을 초기화하려면:
```
/clear
```

---

## 8. PM2로 서버 관리

### PM2란?

PM2는 Node.js 프로세스 매니저로, 서버 자동 재시작, 로깅, 모니터링 등을 제공합니다.

### PM2 설치

```bash
npm install -g pm2
```

### 서버 시작

```bash
# ecosystem.config.js 사용
npx pm2 start ecosystem.config.js

# 또는 직접 실행
npx pm2 start dist/index.js --name clawdbot-kakaotalk
```

### 주요 명령어

```bash
# 프로세스 목록 확인
npx pm2 list

# 실시간 로그 보기
npx pm2 logs clawdbot-kakaotalk

# 특정 줄 수만 보기
npx pm2 logs clawdbot-kakaotalk --lines 100

# 서버 재시작
npx pm2 restart clawdbot-kakaotalk

# 서버 중지
npx pm2 stop clawdbot-kakaotalk

# 프로세스 삭제
npx pm2 delete clawdbot-kakaotalk

# 모니터링 대시보드
npx pm2 monit
```

### Windows 자동 시작 설정

#### 1. 현재 상태 저장

```bash
npx pm2 save
```

#### 2. 시작 스크립트 생성

`start-pm2.vbs` 파일을 시작 폴더에 생성:

**경로:** `C:\Users\<사용자>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\`

**내용:**
```vbscript
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c npx pm2 resurrect", 0, False
```

### ecosystem.config.js 설명

```javascript
module.exports = {
  apps: [
    {
      name: 'clawdbot-kakaotalk',     // 프로세스 이름
      script: 'dist/index.js',        // 실행 파일
      instances: 1,                   // 인스턴스 수
      autorestart: true,              // 자동 재시작
      windowsHide: true,              // Windows 창 숨김
      max_memory_restart: '500M',     // 메모리 초과 시 재시작
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

---

## 9. 트러블슈팅

### 문제: "AI 챗봇 콜백 기능이 필요합니다"

**원인:** AI 챗봇 콜백 기능이 승인되지 않음

**해결:**
1. 카카오 챗봇 관리자센터 → 설정 → AI 챗봇
2. AI 챗봇 콜백 기능 신청
3. 승인될 때까지 대기 (1-2일)

---

### 문제: 응답이 오지 않음

**체크리스트:**

```bash
# 1. 서버 실행 확인
npx pm2 list

# 2. 서버 로그 확인
npx pm2 logs clawdbot-kakaotalk

# 3. 터널 상태 확인
# ngrok 대시보드: http://127.0.0.1:4040

# 4. Clawdbot Gateway 상태 확인
curl http://localhost:18789/health
```

**해결 순서:**
1. 서버가 실행 중인지 확인
2. ngrok 터널이 활성화되어 있는지 확인
3. 카카오 스킬 URL이 정확한지 확인
4. Clawdbot Gateway가 실행 중인지 확인

---

### 문제: "인증 코드가 일치하지 않습니다"

**원인:** PAIRING_CODE 불일치

**해결:**
1. `.env` 파일의 `PAIRING_CODE` 값 확인
2. 카카오톡에서 정확한 코드로 다시 시도:
   ```
   /pair 정확한코드 이름
   ```

---

### 문제: "인증 시도 횟수 초과"

**원인:** 5회 이상 잘못된 코드 입력

**해결:**
1. 24시간 후 자동 초기화
2. 또는 서버 재시작:
   ```bash
   npx pm2 restart clawdbot-kakaotalk
   ```

---

### 문제: ngrok URL이 변경됨

**원인:** ngrok 무료 버전은 재시작 시 URL 변경

**해결 옵션:**

1. **ngrok Personal ($8/월)** - 고정 도메인 제공
   ```bash
   ngrok http --domain=your-domain.ngrok-free.dev 3000
   ```

2. **Cloudflare Tunnel (무료)** - 고정 도메인
   ```bash
   cloudflared tunnel run kakaotalk-bot
   ```

---

### 문제: Windows에서 창이 깜빡임

**원인:** spawn 호출 시 콘솔 창 생성

**해결:**
1. `ecosystem.config.js`에 `windowsHide: true` 추가
2. Clawdbot 패키지 내부 수정 필요:
   - `%APPDATA%/npm/node_modules/clawdbot/dist/entry.js`
   - spawn 옵션에 `windowsHide: true` 추가

---

## 10. FAQ

### Q: 여러 사람이 동시에 사용할 수 있나요?

**A:** 네! 각 사용자는 개별 세션으로 분리되어 대화 기록이 공유되지 않습니다. 각 사용자는 `/pair` 명령으로 인증해야 합니다.

---

### Q: 인증된 사용자 목록은 어디에 저장되나요?

**A:** `data/allowed-users.json` 파일에 저장됩니다:

```json
[
  {
    "kakaoId": "abc123",
    "name": "홍길동",
    "addedAt": "2024-01-28T12:00:00.000Z"
  }
]
```

사용자를 수동으로 추가/제거하려면 이 파일을 직접 편집하세요.

---

### Q: 대화 기록은 얼마나 유지되나요?

**A:**
- 세션: 24시간 (메모리)
- 대화 기록: 최대 20개 메시지
- 인증 정보: 영구 (파일 저장)

---

### Q: AI 응답에 시간이 오래 걸리면?

**A:** 콜백 방식으로 처리되므로 최대 2분까지 기다립니다. 그 전에 응답이 도착하면 카카오톡으로 전송됩니다.

---

### Q: 카카오톡 메시지 길이 제한은?

**A:**
- 텍스트 말풍선: 1000자
- 최대 말풍선 수: 3개
- 긴 응답은 자동으로 분할됩니다

---

### Q: 서버 비용이 드나요?

**A:**
- 서버 자체: 무료 (로컬 실행)
- ngrok 무료: URL이 변경됨
- ngrok Personal: $8/월 (고정 도메인)
- Cloudflare Tunnel: 무료

---

### Q: 이미지나 파일을 보낼 수 있나요?

**A:** 현재 Phase 1에서는 텍스트만 지원합니다. Phase 4에서 이미지/파일 처리 예정입니다.

---

## 📚 추가 리소스

- [카카오 비즈니스 문서](https://kakaobusiness.gitbook.io)
- [카카오 챗봇 스킬 가이드](https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide)
- [PM2 공식 문서](https://pm2.keymetrics.io/docs)
- [ngrok 공식 문서](https://ngrok.com/docs)

---

## 🆘 도움이 필요하신가요?

문제가 해결되지 않으면:

1. `npx pm2 logs clawdbot-kakaotalk` 로그 확인
2. GitHub Issues에 문의
3. 로그와 함께 상황 설명

---

*마지막 업데이트: 2024년 1월*
