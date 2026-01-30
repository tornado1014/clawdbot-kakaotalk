# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./
COPY tsconfig.json ./

# 의존성 설치
RUN npm ci

# 소스 복사 및 빌드
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm ci --omit=dev

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist

# 데이터 디렉토리 생성
RUN mkdir -p /app/data

# 비root 사용자로 실행
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# 환경 변수
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
