const REDACTED = '[redacted]';

function normalizeKey(key: string): string {
  return key.replace(/[-_.\s]/g, '').toLowerCase();
}

export function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return (
    normalized === 'apikey' ||
    normalized.endsWith('apikey') ||
    normalized === 'accesskey' ||
    normalized.endsWith('accesskey') ||
    normalized === 'token' ||
    normalized.endsWith('token') ||
    normalized === 'secret' ||
    normalized.endsWith('secret') ||
    normalized === 'authorization' ||
    normalized === 'password' ||
    normalized === 'credential' ||
    normalized === 'credentials' ||
    normalized === 'oauth'
  );
}

export function redactSensitiveValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? REDACTED : redactSensitiveValue(item),
    ]),
  );
}

