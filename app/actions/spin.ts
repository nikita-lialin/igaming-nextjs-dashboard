"use server";

import { randomInt, randomUUID } from "node:crypto";
import {
  REEL_COUNT,
  SYMBOLS,
  evaluate,
  isBet,
  type Reels,
  type SpinRecord,
  type SpinResponse,
} from "@/lib/slot-game";
import { openWallet } from "@/lib/wallet";

/**
 * Server Action — это публичный POST-эндпоинт. Её можно вызвать curl-ом,
 * минуя наш UI, с любыми аргументами. Поэтому:
 *   1. аргументы валидируются в рантайме (`bet: unknown`, а не `Bet`);
 *   2. баланс берётся из серверного хранилища, а не из аргументов;
 *   3. символы выбираются здесь, клиент их не присылает.
 */

/** CSPRNG вместо Math.random(): результат нельзя предсказать по предыдущим. */
function drawReels(): Reels {
  return Array.from(
    { length: REEL_COUNT },
    () => SYMBOLS[randomInt(SYMBOLS.length)],
  );
}

export async function spin(rawBet: unknown): Promise<SpinResponse> {
  const wallet = await openWallet();

  if (!isBet(rawBet)) {
    return { ok: false, error: "INVALID_BET", balance: wallet.balance };
  }
  const bet = rawBet;

  if (!wallet.debit(bet)) {
    return { ok: false, error: "INSUFFICIENT_FUNDS", balance: wallet.balance };
  }

  const reels = drawReels();
  const { multiplier, payout } = evaluate(reels, bet);
  if (payout > 0) wallet.credit(payout);

  const record: SpinRecord = {
    id: randomUUID(),
    at: Date.now(),
    bet,
    reels,
    payout,
  };
  wallet.addSpin(record);

  return {
    ok: true,
    reels,
    bet,
    multiplier,
    payout,
    balance: wallet.balance,
    record,
  };
}

/** Сброс демо-баланса после проигрыша всех средств. */
export async function resetWallet(): Promise<{ balance: number }> {
  const wallet = await openWallet();
  wallet.reset();
  return { balance: wallet.balance };
}
