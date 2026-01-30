# Cloudflare Tunnel Setup Script (Windows PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "[*] Cloudflare Tunnel Setup Starting..." -ForegroundColor Cyan

# Check cloudflared installation
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    Write-Host "[X] cloudflared is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation:" -ForegroundColor Yellow
    Write-Host "  winget install Cloudflare.cloudflared"
    Write-Host ""
    Write-Host "Or visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
}

Write-Host "[OK] cloudflared found" -ForegroundColor Green

# Tunnel name
$TUNNEL_NAME = "kakaotalk-bot"

# Check login status
Write-Host ""
Write-Host "Checking Cloudflare login status..."
$tunnelList = cloudflared tunnel list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Login required. Browser will open..." -ForegroundColor Yellow
    cloudflared tunnel login
}

# Check existing tunnel
$tunnelList = cloudflared tunnel list
if ($tunnelList -match $TUNNEL_NAME) {
    Write-Host "[OK] Tunnel '$TUNNEL_NAME' already exists." -ForegroundColor Green
} else {
    Write-Host "Creating tunnel '$TUNNEL_NAME'..."
    cloudflared tunnel create $TUNNEL_NAME
}

# Config directory
$CONFIG_DIR = "$env:USERPROFILE\.cloudflared"
$CONFIG_FILE = "$CONFIG_DIR\config-$TUNNEL_NAME.yml"

# Get tunnel ID
$tunnelInfo = cloudflared tunnel list | Select-String $TUNNEL_NAME
$TUNNEL_ID = ($tunnelInfo -split '\s+')[0]
Write-Host "Tunnel ID: $TUNNEL_ID"

# Create config file
Write-Host ""
Write-Host "Creating config file: $CONFIG_FILE"

$configContent = @"
# Cloudflare Tunnel Config - Clawdbot KakaoTalk
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR\$TUNNEL_ID.json

ingress:
  - hostname: kakao.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
"@

Set-Content -Path $CONFIG_FILE -Value $configContent -Encoding UTF8

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[OK] Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Add DNS record (in Cloudflare dashboard):"
Write-Host "   cloudflared tunnel route dns $TUNNEL_NAME kakao.yourdomain.com"
Write-Host ""
Write-Host "2. Run tunnel:"
Write-Host "   cloudflared tunnel --config $CONFIG_FILE run $TUNNEL_NAME"
Write-Host ""
Write-Host "3. Register skill server URL in Kakao Chatbot Admin:"
Write-Host "   https://kakao.yourdomain.com/skill"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
