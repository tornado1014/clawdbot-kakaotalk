import winston from "winston";
import { config } from "./config";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] ${stack || message}`;
});

export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});

// 파일 로깅 (선택적)
if (process.env.LOG_FILE) {
  logger.add(
    new winston.transports.File({
      filename: process.env.LOG_FILE,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}
