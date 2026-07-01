import type { Player } from './types';

export interface NetResult {
  id: string;
  name: string;
  invested: number; // chips bought in
  stack: number; // chips held now
  netChips: number; // stack - invested
  netDollars: number;
}

export interface Payment {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  chips: number;
  dollars: number;
}

export interface Settlement {
  nets: NetResult[];
  payments: Payment[];
  balanced: boolean; // true when chips won == chips lost (zero-sum)
}

/**
 * Net win/loss per player plus a minimal set of "who pays whom" transactions.
 * Uses a greedy largest-debtor / largest-creditor match, which produces at most
 * (n-1) payments. All math is done in whole chips (exact); dollars are derived.
 */
export function computeSettlement(
  players: Player[],
  chipValue: number,
): Settlement {
  const nets: NetResult[] = players.map((p) => {
    const netChips = p.stack - p.totalInvested;
    return {
      id: p.id,
      name: p.name,
      invested: p.totalInvested,
      stack: p.stack,
      netChips,
      netDollars: round2(netChips * chipValue),
    };
  });

  const balanced = nets.reduce((s, n) => s + n.netChips, 0) === 0;

  // Work on mutable copies for the greedy match.
  const creditors = nets
    .filter((n) => n.netChips > 0)
    .map((n) => ({ ...n, remaining: n.netChips }))
    .sort((a, b) => b.remaining - a.remaining);
  const debtors = nets
    .filter((n) => n.netChips < 0)
    .map((n) => ({ ...n, remaining: -n.netChips }))
    .sort((a, b) => b.remaining - a.remaining);

  const payments: Payment[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const chips = Math.min(c.remaining, d.remaining);
    if (chips > 0) {
      payments.push({
        fromId: d.id,
        fromName: d.name,
        toId: c.id,
        toName: c.name,
        chips,
        dollars: round2(chips * chipValue),
      });
    }
    c.remaining -= chips;
    d.remaining -= chips;
    if (c.remaining === 0) ci++;
    if (d.remaining === 0) di++;
  }

  return { nets, payments, balanced };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
