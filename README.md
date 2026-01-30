# 🦞 Clawdbot × 카카오톡 통합

카카오톡 채널을 통해 Clawdbot AI 어시스턴트와 대화하고, 시스템 제어까지 가능하게 만드는 통합 플러그인입니다.

## 주요 기능

- 📱 카카오톡에서 AI 어시스턴트와 자연스러운 대화
- 🔐 Pairing 코드 인증으로 가족/팀 멤버만 사용 가능
- 💬 대화 컨텍스트 유지 (이전 대화 기억)
- ⚡ 5초 타임아웃 우회 (콜백 API 활용)
- 🛠️ Clawdbot 도구(Tools) 연동 가능

## 빠른 시작

### 1. 의존성 설치

```bash
cd clawdbot-kakaotalk
npm install
```

### 2. 환경 설정

```bash
cp .env.example .env
# .env 파일을 열어 설정 수정
```

주요 설정:
- `PORT`: 서버 포트 (기본: 3000)
- `PAIRING_CODE`: 인증 코드 (필수 변경!)
- `ADMIN_KAKAO_ID`: 관리자 카카오 ID

### 3. 서버 실행

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 프로덕션
npm run build && npm start
```

### 4. 터널 설정 (Cloudflare)

```powershell
# Windows
.\scripts\setup-tunnel.ps1

# Linux/macOS
./scripts/setup-tunnel.sh
```

### 5. 카카오 챗봇 설정

1. [카카오 비즈니스](https://business.kakao.com) 계정 생성
2. 카카오톡 채널 개설
3. 챗봇 관리자센터에서 봇 생성
4. **AI 챗봇 콜백 기능 신청** (중요!)
5. 스킬 서버 URL 등록: `https://your-tunnel-domain.com/skill`

## 사용 방법

### 첫 인증

카카오톡 채널에서:
```
/pair mySecretCode 홍길동
```

### 기본 명령어

| 명령어 | 설명 |
|--------|------|
| `/help` | 도움말 표시 |
| `/clear` | 대화 기록 초기화 |
| `/status` | 시스템 상태 확인 |

### 일반 대화

```
안녕하세요!
오늘 날씨 어때?
일정 알려줘
```

## 아키텍처

```
카카오톡 사용자
    ↓ 메시지
카카오 서버 (POST /skill)
    ↓
[Webhook Server] Express handler
    ↓ 즉시 응답 "🦞 생각 중..."
[Session Manager] 인증 확인
    ↓
[Clawdbot Bridge] AI 처리
    ↓
[Kakao API] 콜백 전송
    ↓
카카오톡 말풍선 표시
```

## 파일 구조

```
clawdbot-kakaotalk/
├── src/
│   ├── index.ts           # 메인 엔트리
│   ├── webhook-server.ts  # Express 서버
│   ├── kakao-api.ts       # 카카오 API 클라이언트
│   ├── clawdbot-bridge.ts # Clawdbot 연동
│   ├── session-manager.ts # 세션/인증 관리
│   ├── config.ts          # 설정 로더
│   ├── logger.ts          # 로깅
│   └── types.ts           # 타입 정의
├── scripts/
│   ├── setup-tunnel.ps1   # Windows 터널 설정
│   └── setup-tunnel.sh    # Linux/macOS 터널 설정
├── data/
│   └── allowed-users.json # 인증된 사용자 목록
├── .env.example           # 환경 변수 예시
├── package.json
├── tsconfig.json
└── README.md
```

## 보안 고려사항

1. **Pairing 코드 변경**: 기본 코드는 반드시 변경하세요
2. **HTTPS 필수**: Cloudflare Tunnel은 자동으로 HTTPS 적용
3. **허용 사용자 관리**: `data/allowed-users.json`에서 관리
4. **민감 도구 제한**: Clawdbot 설정에서 도구 권한 관리

## 트러블슈팅

### "AI 챗봇 콜백 기능이 필요합니다"

카카오 챗봇 관리자센터에서 AI 챗봇 콜백 기능을 신청하세요.
승인에 1-2일 소요될 수 있습니다.

### 응답이 오지 않음

1. 서버 로그 확인: `npm run dev`
2. 터널 상태 확인: `cloudflared tunnel info kakaotalk-bot`
3. 카카오 스킬 서버 URL이 정확한지 확인

### 인증 시도 횟수 초과

세션이 자동으로 초기화됩니다 (24시간).
또는 서버를 재시작하세요.

## 개발 로드맵

- [x] Phase 1: 기본 텍스트 대화
- [ ] Phase 2: 리치 메시지 (버튼, 카드)
- [ ] Phase 3: 도구 통합 (날씨, 캘린더)
- [ ] Phase 4: 파일/이미지 처리
- [ ] Phase 5: 음성 메시지 지원

## 라이선스

MIT License
