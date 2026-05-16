import type { ExpenseSplitMethod } from '@/lib/types/database';

/**
 * Pure functions to split an expense among members. All amounts are in cents.
 */

export interface SplitMember {
  user_id: string;
  /** For percentage split: 0–100. For fixed_amount: cents. For custom: weight or cents. */
  value?: number;
}

export interface AllocatedShare {
  user_id: string;
  share_cents: number;
  share_percentage: number;
}

export interface SplitInput {
  total_cents: number;
  method: ExpenseSplitMethod;
  members: SplitMember[];
}

export function computeSplit({ total_cents, method, members }: SplitInput): AllocatedShare[] {
  if (members.length === 0) return [];
  if (total_cents < 0) throw new Error('Total cannot be negative');

  switch (method) {
    case 'equal':
      return distributeEvenly(total_cents, members);
    case 'percentage':
      return distributeByPercentage(total_cents, members);
    case 'fixed_amount':
      return distributeByFixedAmount(total_cents, members);
    case 'custom':
      return distributeByWeights(total_cents, members);
    default:
      throw new Error(`Unsupported split method: ${method satisfies never}`);
  }
}

function distributeEvenly(total: number, members: SplitMember[]): AllocatedShare[] {
  const n = members.length;
  const base = Math.floor(total / n);
  let remainder = total - base * n;
  return members.map((m) => {
    const cents = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { user_id: m.user_id, share_cents: cents, share_percentage: round2((cents / total) * 100) };
  });
}

function distributeByPercentage(total: number, members: SplitMember[]): AllocatedShare[] {
  const sum = members.reduce((acc, m) => acc + (m.value ?? 0), 0);
  if (Math.abs(sum - 100) > 0.05) {
    throw new Error(`Percentages must sum to 100 (got ${sum})`);
  }
  // Compute raw cents, distribute rounding error to the largest share.
  const raw = members.map((m) => ({
    user_id: m.user_id,
    pct: m.value ?? 0,
    centsExact: ((m.value ?? 0) / 100) * total,
  }));
  const rounded = raw.map((r) => ({ ...r, share_cents: Math.floor(r.centsExact) }));
  const used = rounded.reduce((a, r) => a + r.share_cents, 0);
  let diff = total - used;
  rounded.sort((a, b) => b.centsExact - a.centsExact);
  for (let i = 0; diff > 0 && i < rounded.length; i++, diff--) {
    rounded[i]!.share_cents += 1;
  }
  return rounded.map((r) => ({ user_id: r.user_id, share_cents: r.share_cents, share_percentage: round2(r.pct) }));
}

function distributeByFixedAmount(total: number, members: SplitMember[]): AllocatedShare[] {
  const sum = members.reduce((acc, m) => acc + (m.value ?? 0), 0);
  if (sum !== total) {
    throw new Error(`Fixed amounts must sum to total (${sum} vs ${total})`);
  }
  return members.map((m) => ({
    user_id: m.user_id,
    share_cents: m.value ?? 0,
    share_percentage: round2(((m.value ?? 0) / total) * 100),
  }));
}

function distributeByWeights(total: number, members: SplitMember[]): AllocatedShare[] {
  const sum = members.reduce((acc, m) => acc + (m.value ?? 0), 0);
  if (sum <= 0) throw new Error('Weights must be > 0');
  const raw = members.map((m) => ({
    user_id: m.user_id,
    weight: m.value ?? 0,
    centsExact: ((m.value ?? 0) / sum) * total,
  }));
  const rounded = raw.map((r) => ({ ...r, share_cents: Math.floor(r.centsExact) }));
  const used = rounded.reduce((a, r) => a + r.share_cents, 0);
  let diff = total - used;
  rounded.sort((a, b) => b.centsExact - a.centsExact);
  for (let i = 0; diff > 0 && i < rounded.length; i++, diff--) {
    rounded[i]!.share_cents += 1;
  }
  return rounded.map((r) => ({
    user_id: r.user_id,
    share_cents: r.share_cents,
    share_percentage: round2((r.share_cents / total) * 100),
  }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Who owes whom — debt simplification
// ---------------------------------------------------------------------------

export interface MemberDebtBalance {
  user_id: string;
  /** Positive = owed money (creditor). Negative = owes money (debtor). */
  net_cents: number;
}

export function computeBalances(
  allocations: Array<{ expense_id: string; user_id: string; share_cents: number }>,
  payments: Array<{ expense_id: string; user_id: string; paid_cents: number }>,
): MemberDebtBalance[] {
  const net = new Map<string, number>();
  for (const a of allocations) net.set(a.user_id, (net.get(a.user_id) ?? 0) - a.share_cents);
  for (const p of payments) net.set(p.user_id, (net.get(p.user_id) ?? 0) + p.paid_cents);
  return [...net.entries()].map(([user_id, net_cents]) => ({ user_id, net_cents }));
}

export interface Transfer {
  from: string;
  to: string;
  amount_cents: number;
}

/** Minimal-transaction debt simplification (greedy). */
export function settleBalances(balances: MemberDebtBalance[]): Transfer[] {
  const debtors = balances.filter((b) => b.net_cents < 0).map((b) => ({ ...b }));
  const creditors = balances.filter((b) => b.net_cents > 0).map((b) => ({ ...b }));
  debtors.sort((a, b) => a.net_cents - b.net_cents);
  creditors.sort((a, b) => b.net_cents - a.net_cents);

  const transfers: Transfer[] = [];
  while (debtors.length > 0 && creditors.length > 0) {
    const d = debtors[0]!;
    const c = creditors[0]!;
    const amount = Math.min(-d.net_cents, c.net_cents);
    if (amount > 0) transfers.push({ from: d.user_id, to: c.user_id, amount_cents: amount });
    d.net_cents += amount;
    c.net_cents -= amount;
    if (d.net_cents === 0) debtors.shift();
    if (c.net_cents === 0) creditors.shift();
  }
  return transfers;
}
