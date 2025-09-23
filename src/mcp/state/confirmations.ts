import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

export type ConfirmationRecord = {
  id: string;
  draft: Record<string, unknown>;
  reason?: string;
  createdAt: number;
  expiresAt: number;
};

const DEFAULT_TTL_SECONDS = 3600;
const confirmations = new Map<string, ConfirmationRecord>();

const now = () => Date.now();

function purgeExpired() {
  const current = now();
  for (const [id, record] of confirmations.entries()) {
    if (record.expiresAt <= current) {
      confirmations.delete(id);
    }
  }
}

export function createConfirmation({
  draft,
  reason,
  ttlSeconds = DEFAULT_TTL_SECONDS,
}: {
  draft: Record<string, unknown>;
  reason?: string;
  ttlSeconds?: number;
}): ConfirmationRecord {
  purgeExpired();
  const id = nanoid();
  const createdAt = now();
  const expiresAt = createdAt + ttlSeconds * 1000;
  const record: ConfirmationRecord = { id, draft, reason, createdAt, expiresAt };
  confirmations.set(id, record);
  return record;
}

export function getConfirmation(id: string): ConfirmationRecord | undefined {
  purgeExpired();
  const record = confirmations.get(id);
  if (!record) return undefined;
  if (record.expiresAt <= now()) {
    confirmations.delete(id);
    return undefined;
  }
  return record;
}

export function listConfirmations(): ConfirmationRecord[] {
  purgeExpired();
  return Array.from(confirmations.values());
}
