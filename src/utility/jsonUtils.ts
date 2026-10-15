import logger from '../plugins/logger-plugins';

export function safeParseJSON<T = any>(value: any, fallback: T, logInstance = logger): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logInstance.warn({ err: error, value }, 'Failed to parse JSON, returning fallback');
    return fallback;
  }
}

export function parseJsonBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
}
