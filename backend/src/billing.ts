import fs from 'fs';
import path from 'path';

export type PlanKey = 'free' | 'starter' | 'pro';
export type BillingProvider = 'stripe' | 'crypto';

export type UserRecord = {
  id: string;
  email: string | null;
  plan: PlanKey;
  credits: number;
  usage: Record<'analyze' | 'optimize' | 'fpsBoost', number>;
  resetAt: number;
  createdAt: number;
  updatedAt: number;
  provider: BillingProvider | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  lastPaymentEventId: string | null;
};

const storageFile = path.join(__dirname, '../data/users.json');

const ensureFile = () => {
  if (!fs.existsSync(storageFile)) {
    fs.writeFileSync(storageFile, JSON.stringify({}, null, 2));
  }
};

const readUsers = (): Record<string, UserRecord> => {
  ensureFile();
  try {
    const raw = fs.readFileSync(storageFile, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeUsers = (users: Record<string, UserRecord>) => {
  ensureFile();
  fs.writeFileSync(storageFile, JSON.stringify(users, null, 2));
};

export const createUserRecord = (id: string): UserRecord => {
  const now = Date.now();
  const user: UserRecord = {
    id,
    email: null,
    plan: 'free',
    credits: 25,
    usage: { analyze: 0, optimize: 0, fpsBoost: 0 },
    resetAt: now,
    createdAt: now,
    updatedAt: now,
    provider: null,
    providerCustomerId: null,
    providerSubscriptionId: null,
    lastPaymentEventId: null
  };

  const users = readUsers();
  users[id] = user;
  writeUsers(users);
  return user;
};

export const getUserRecord = (id: string): UserRecord | null => {
  const users = readUsers();
  return users[id] ?? null;
};

export const upsertUserRecord = (id: string, next: Partial<UserRecord>) => {
  const users = readUsers();
  const existing = users[id] ?? createUserRecord(id);
  const merged: UserRecord = {
    ...existing,
    ...next,
    usage: {
      analyze: Number(next.usage?.analyze ?? existing.usage.analyze ?? 0),
      optimize: Number(next.usage?.optimize ?? existing.usage.optimize ?? 0),
      fpsBoost: Number(next.usage?.fpsBoost ?? existing.usage.fpsBoost ?? 0)
    },
    updatedAt: Date.now()
  };

  users[id] = merged;
  writeUsers(users);
  return merged;
};

export const setUserPlan = (id: string, plan: PlanKey) => {
  return upsertUserRecord(id, { plan });
};

export const addCredits = (id: string, amount: number) => {
  const existing = getUserRecord(id) ?? createUserRecord(id);
  const nextCredits = Math.max(0, Number(existing.credits || 0) + Number(amount || 0));
  return upsertUserRecord(id, { credits: nextCredits });
};

export const markPayment = (id: string, provider: BillingProvider, providerCustomerId: string | null, providerSubscriptionId: string | null, paymentEventId: string | null, plan: PlanKey) => {
  return upsertUserRecord(id, {
    provider,
    providerCustomerId,
    providerSubscriptionId,
    lastPaymentEventId: paymentEventId,
    plan,
    updatedAt: Date.now()
  });
};

export const bumpUsage = (id: string, operation: 'analyze' | 'optimize' | 'fpsBoost', amount: number) => {
  const existing = getUserRecord(id) ?? createUserRecord(id);
  const nextUsage = { ...existing.usage, [operation]: Number(existing.usage[operation] || 0) + Number(amount || 0) };
  return upsertUserRecord(id, { usage: nextUsage });
};
