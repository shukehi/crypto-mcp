import pino from 'pino';

const isStdioMode = process.env.TRANSPORT === 'stdio';

export const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  isStdioMode ? process.stderr : process.stdout
);
