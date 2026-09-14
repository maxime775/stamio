export type AdminPollClosesAtInput = {
  editing: boolean;
  originalClosesAt: string | null;
  closesAtTouched: boolean;
  rawDays: string;
  now?: number;
};

export function computeAdminPollClosesAt(rawDays: string, now = Date.now()) {
  const days = Number(rawDays);
  if (!Number.isFinite(days) || days < 1 || days > 90) return null;
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}

export function resolveAdminPollClosesAt({
  editing,
  originalClosesAt,
  closesAtTouched,
  rawDays,
  now
}: AdminPollClosesAtInput) {
  if (editing && !closesAtTouched) return originalClosesAt;
  return computeAdminPollClosesAt(rawDays, now);
}
