/** Display helpers for chips and money. */

export function chips(n: number): string {
  return n.toLocaleString('en-US');
}

export function dollars(chipsAmount: number, chipValue: number): string {
  const v = chipsAmount * chipValue;
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

export function signedChips(n: number): string {
  return (n > 0 ? '+' : '') + chips(n);
}
