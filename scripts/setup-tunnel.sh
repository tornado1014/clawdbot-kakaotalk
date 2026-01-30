#!/bin/bash
# Cloudflare Tunnel 설정 스크립트

set -e

echo "🌐 Cloudflare Tunnel 설정 시작..."

# Cloudflared 설치 확인
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared가 설치되어 있지 않습니다."
    echo ""
    echo "설치 방법:"
    echo "  Windows: winget install Cloudflare.cloudflared"
    echo "  macOS:   brew install cloudflared"
    echo "  Linux:   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

echo "✅ cloudflared 발견: $(cloudflared --version)"

# 터널 이름
TUNNEL_NAME="kakaotalk-bot"

# 로그인 확인
echo ""
echo "Cloudflare 로그인 상태 확인 중..."
if ! cloudflared tunnel list &> /dev/null; then
    echo "로그인이 필요합니다. 브라우저가 열립니다..."
    cloudflared tunnel login
fi

# 기존 터널 확인
if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo "✅ 터널 '$TUNNEL_NAME'이 이미 존재합니다."
else
    echo "터널 '$TUNNEL_NAME' 생성 중..."
    cloudflared tunnel create "$TUNNEL_NAME"
fi

# 터널 ID 가져오기
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo "터널 ID: $TUNNEL_ID"

# 설정 파일 생성
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config-$TUNNEL_NAME.yml"

echo ""
echo "설정 파일 생성 중: $CONFIG_FILE"

cat > "$CONFIG_FILE" << EOF
# Cloudflare Tunnel 설정 - Clawdbot 카카오톡
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  - hostname: kakao.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ 설정 완료!"
echo ""
echo "📝 다음 단계:"
echo ""
echo "1. DNS 레코드 추가 (Cloudflare 대시보드에서):"
echo "   cloudflared tunnel route dns $TUNNEL_NAME kakao.yourdomain.com"
echo ""
echo "2. 터널 실행:"
echo "   cloudflared tunnel --config $CONFIG_FILE run $TUNNEL_NAME"
echo ""
echo "3. 카카오 챗봇 관리자센터에서 스킬 서버 URL 등록:"
echo "   https://kakao.yourdomain.com/skill"
echo ""
echo "═══════════════════════════════════════════════════════════"
