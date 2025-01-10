import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import DailyRotateFile from 'winston-daily-rotate-file';
import { format } from 'winston';
import { format as formatDate } from 'date-fns';
import fs from 'fs';
 
// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url); // Get the file path
const __dirname = path.dirname(__filename); // Get the directory name

// Define log file path (use '/tmp/logs' for Vercel deployment)
const logDirectory = process.env.LOG_DIR || path.join(__dirname, 'logs');

// Ensure the log directory exists
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
  console.log('Log directory created:', logDirectory);
}

// Custom timestamp format
const customTimestampFormat = format((info) => {
  if (info.timestamp) {
    info.timestamp = formatDate(new Date(info.timestamp), 'yyyy-MM-dd HH:mm:ss');
  }
  return info;
})();

// Stack trace format for error logs
const stackTraceFormat = format((info) => {
  if (info.level === 'error' && info.stack) {
    info.message += `\nStack trace:\n${info.stack}`;
  }
  return info;
})();

// Define the logger
const logger = winston.createLogger({
  level: 'debug', // Change to 'debug' for testing
  format: format.combine(
    format.timestamp(),
    customTimestampFormat, // Apply custom timestamp format
    format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDirectory, '%DATE%-daily.log'), // Ensure this path is correct
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      zippedArchive: true,
      level: 'info', // Ensure this is set correctly for daily rotation
    }),
    new winston.transports.Console(), // Log to the console for real-time debugging
  ],
});

// Export the logger instance and its methods
export const log = {
  info: (message) => logger.info(message), 
  warn: (message) => logger.warn(message),
  error: (message) => logger.error(message),
  debug: (message) => logger.debug(message),
};
