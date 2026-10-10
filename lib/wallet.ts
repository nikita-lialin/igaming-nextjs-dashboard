import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  HISTORY_LIMIT,
  STARTING_BALANCE,
  type SpinRecord,
} from "@/lib/slot-game";

/**
 * Серверный кошелёк.
 *
 * ⚠ ДЕМО-РЕАЛИЗАЦИЯ: балансы лежат в памяти Node-процесса. Этого достаточно,
 * чтобы показать архитектуру (баланс принадлежит серверу), но:
 *   - данные пропадают при рестарте процесса;
 *   - не работает при нескольких инстансах / serverless.
 * В продакшене замените `balances` на БД (PostgreSQL/Redis), а дебет делайте
 * одной атомарной операцией: `UPDATE wallets SET balance = balance - $bet
 * WHERE user_id = $id AND balance >= $bet RETURNING balance`.
 *
 * Идентификатор сессии — случайный UUID в httpOnly-cookie. JS на клиенте его
 * не видит, а сам баланс в cookie не хранится вообще.
 */

const SESSION_COOKIE = "casino_sid";

// globalThis — чтобы Map переживал HMR-перезагрузки модуля в `next dev`.
const globalStore = globalThis as typeof globalThis & {
  __casinoBalances?: Map<string, number>;
  __casinoHistory?: Map<string, SpinRecord[]>;
};
const balances = (globalStore.__casinoBalances ??= new Map<string, number>());
// Последние спины сессии, новые — первыми. Аналог таблицы `spins` в БД.
const histories = (globalStore.__casinoHistory ??= new Map<
  string,
  SpinRecord[]
>());

/** Только чтение: безопасно для Server Components (cookie не ставится). */
export async function readBalance(): Promise<number> {
  const sid = (await cookies()).get(SESSION_COOKIE)?.value;
  return (sid ? balances.get(sid) : undefined) ?? STARTING_BALANCE;
}

export async function readHistory(): Promise<SpinRecord[]> {
  const sid = (await cookies()).get(SESSION_COOKIE)?.value;
  return (sid ? histories.get(sid) : undefined) ?? [];
}

export interface Wallet {
  readonly balance: number;
  /** Атомарно списывает сумму. false — если средств недостаточно. */
  debit(amount: number): boolean;
  credit(amount: number): void;
  addSpin(record: SpinRecord): void;
  reset(): void;
}

/** Только для Server Actions: при необходимости создаёт сессию и ставит cookie. */
export async function openWallet(): Promise<Wallet> {
  const cookieStore = await cookies();
  let sid = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sid || !balances.has(sid)) {
    sid = randomUUID();
    balances.set(sid, STARTING_BALANCE);
    cookieStore.set(SESSION_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  const id = sid;
  return {
    get balance() {
      return balances.get(id) ?? 0;
    },
    // Между проверкой и списанием нет `await`, поэтому в одном процессе Node
    // два параллельных запроса не смогут оба пройти проверку (нет double-spend).
    debit(amount) {
      const current = balances.get(id) ?? 0;
      if (current < amount) return false;
      balances.set(id, current - amount);
      return true;
    },
    credit(amount) {
      balances.set(id, (balances.get(id) ?? 0) + amount);
    },
    addSpin(record) {
      const list = histories.get(id) ?? [];
      histories.set(id, [record, ...list].slice(0, HISTORY_LIMIT));
    },
    reset() {
      balances.set(id, STARTING_BALANCE);
    },
  };
}
