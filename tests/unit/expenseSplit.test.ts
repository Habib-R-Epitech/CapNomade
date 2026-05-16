import { describe, expect, it } from 'vitest';
import {
  computeSplit,
  computeBalances,
  settleBalances,
} from '@/lib/stats/expenseSplit';

const m = (id: string, value?: number) => ({ user_id: id, value });

describe('computeSplit — equal', () => {
  it('divides evenly with no remainder', () => {
    const r = computeSplit({ total_cents: 12000, method: 'equal', members: [m('a'), m('b'), m('c')] });
    expect(r.map((x) => x.share_cents)).toEqual([4000, 4000, 4000]);
  });

  it('handles a 1-cent rounding remainder', () => {
    const r = computeSplit({ total_cents: 100, method: 'equal', members: [m('a'), m('b'), m('c')] });
    expect(r.map((x) => x.share_cents).reduce((a, b) => a + b, 0)).toBe(100);
    expect(r.map((x) => x.share_cents).sort()).toEqual([33, 33, 34]);
  });
});

describe('computeSplit — percentage', () => {
  it('respects percentages and reaches the total exactly', () => {
    const r = computeSplit({
      total_cents: 10000,
      method: 'percentage',
      members: [m('a', 60), m('b', 40)],
    });
    expect(r.find((x) => x.user_id === 'a')?.share_cents).toBe(6000);
    expect(r.find((x) => x.user_id === 'b')?.share_cents).toBe(4000);
  });

  it('throws if percentages do not sum to 100', () => {
    expect(() =>
      computeSplit({ total_cents: 100, method: 'percentage', members: [m('a', 50), m('b', 40)] }),
    ).toThrow();
  });
});

describe('computeSplit — fixed_amount', () => {
  it('requires the fixed sums to match', () => {
    expect(() =>
      computeSplit({ total_cents: 100, method: 'fixed_amount', members: [m('a', 50), m('b', 40)] }),
    ).toThrow();
  });

  it('passes through fixed amounts', () => {
    const r = computeSplit({
      total_cents: 100,
      method: 'fixed_amount',
      members: [m('a', 70), m('b', 30)],
    });
    expect(r.map((x) => x.share_cents)).toEqual([70, 30]);
  });
});

describe('settleBalances', () => {
  it('produces minimum transfers for simple debts', () => {
    const balances = [
      { user_id: 'a', net_cents: -300 },
      { user_id: 'b', net_cents: 200 },
      { user_id: 'c', net_cents: 100 },
    ];
    const transfers = settleBalances(balances);
    const totalOut = transfers.reduce((a, t) => a + t.amount_cents, 0);
    expect(totalOut).toBe(300);
    // 'a' is the only debtor — should pay both creditors.
    expect(transfers.filter((t) => t.from === 'a').length).toBe(2);
  });
});

describe('computeBalances + settle pipeline', () => {
  it('zeros out balanced positions', () => {
    const allocations = [
      { expense_id: 'e1', user_id: 'a', share_cents: 500 },
      { expense_id: 'e1', user_id: 'b', share_cents: 500 },
    ];
    const payments = [
      { expense_id: 'e1', user_id: 'a', paid_cents: 1000 },
    ];
    const balances = computeBalances(allocations, payments);
    const transfers = settleBalances(balances);
    expect(transfers).toEqual([{ from: 'b', to: 'a', amount_cents: 500 }]);
  });
});
