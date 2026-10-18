// Synthetic fixture source. Invented for ledgerlight's tests; not real code.

import { withinAskWindow } from './refund-guards.js';

export function applyRefund(daysSinceAsk: number, cooldown: number) {
  if (withinAskWindow(daysSinceAsk, cooldown)) return 'hold';
  return 'ask';
}

export function summariseMove(move: string) {
  return `move=${move}`;
}
