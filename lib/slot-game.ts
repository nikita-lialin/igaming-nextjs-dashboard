/**
 * Общие правила слота: константы, типы и чистая функция расчёта.
 *
 * Модуль намеренно НЕ помечен `server-only`: клиенту нужны символы и список
 * ставок для отрисовки UI. Но решающее значение имеет то, ГДЕ вызывается
 * `evaluate()` и откуда берутся `reels` — это происходит только в Server Action.
 */

/**
 * 8 символов => вероятность «3 из 3» = 1/64, «ровно 2» = 21/64.
 * При множителях x10 / x2 теоретический RTP ≈ 81%.
 */
export const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "💎", "🍀"] as const;
export type SlotSymbol = (typeof SYMBOLS)[number];

export const REEL_COUNT = 3;
export const STARTING_BALANCE = 1000;

export const BET_OPTIONS = [10, 50, 100] as const;
export type Bet = (typeof BET_OPTIONS)[number];

export const MULTIPLIER_THREE = 10;
export const MULTIPLIER_TWO = 2;

export type Reels = SlotSymbol[];

/** Рантайм-проверка: TypeScript-типы не существуют в момент HTTP-запроса. */
export function isBet(value: unknown): value is Bet {
  return BET_OPTIONS.some((option) => option === value);
}

export interface SpinOutcome {
  multiplier: number;
  payout: number;
}

export function evaluate(reels: Reels, bet: number): SpinOutcome {
  const counts = new Map<SlotSymbol, number>();
  for (const symbol of reels) {
    counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  }
  const matches = Math.max(...counts.values());
  const multiplier =
    matches === 3 ? MULTIPLIER_THREE : matches === 2 ? MULTIPLIER_TWO : 0;
  return { multiplier, payout: bet * multiplier };
}

// --- Контракт ответа Server Action -----------------------------------------

export type SpinError = "INVALID_BET" | "INSUFFICIENT_FUNDS";

export type SpinResponse =
  | {
      ok: true;
      reels: Reels;
      bet: Bet;
      multiplier: number;
      payout: number;
      /** Авторитетный баланс после спина — единственный источник правды. */
      balance: number;
      record: SpinRecord;
    }
  | { ok: false; error: SpinError; balance: number };

// --- История спинов ---------------------------------------------------------

export interface SpinRecord {
  id: string;
  /** Unix-время в мс (создаётся на сервере). */
  at: number;
  bet: Bet;
  reels: Reels;
  payout: number;
}

export const HISTORY_LIMIT = 10;
