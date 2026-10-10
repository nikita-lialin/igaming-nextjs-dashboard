"use client";

/**
 * ЗАЧЕМ ЗДЕСЬ 'use client'
 * ------------------------------------------------------------------
 * Клиентским остался только ИНТЕРФЕЙС: состояние кнопок и анимации,
 * onClick, таймеры остановки барабанов. Всё, что влияет на деньги,
 * выполняется в Server Action `spin` (app/actions/spin.ts):
 *   - выбор символов (CSPRNG),
 *   - проверка и списание ставки,
 *   - начисление выигрыша,
 *   - хранение баланса и истории спинов.
 *
 * Клиент отправляет ставку, получает готовый результат и проигрывает
 * его анимацией. Подмена кода в DevTools не изменит серверный баланс.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { resetWallet, spin as spinAction } from "@/app/actions/spin";
import { SpinHistory } from "@/components/spin-history";
import { adjustBalance, setBalance, useBalance } from "@/lib/balance-store";
import { formatMoney } from "@/lib/format";
import {
  BET_OPTIONS,
  HISTORY_LIMIT,
  MULTIPLIER_THREE,
  MULTIPLIER_TWO,
  REEL_COUNT,
  SYMBOLS,
  type Bet,
  type Reels,
  type SlotSymbol,
  type SpinRecord,
  type SpinResponse,
} from "@/lib/slot-game";

// --- Параметры анимации ---------------------------------------------------

/** Минимальное время вращения, даже если сервер ответил мгновенно. */
const MIN_SPIN_MS = 800;
/** Пауза между остановками барабанов (1-й → 2-й → 3-й), мс: нагнетает ожидание. */
const STOP_STEP_MS = 400;
/** Сколько случайных иконок в ленте вращения. */
const STRIP_LENGTH = 12;

const ERROR_MESSAGES = {
  INVALID_BET: "Недопустимая ставка.",
  INSUFFICIENT_FUNDS: "Недостаточно средств.",
  NETWORK:
    "Ошибка соединения. Обновите страницу, чтобы увидеть актуальный баланс.",
} as const;

// --- Один барабан -----------------------------------------------------------

/** Символ после `symbol` в таблице — детерминированно (без random в рендере). */
function nextSymbols(symbol: SlotSymbol, count: number): SlotSymbol[] {
  const start = SYMBOLS.indexOf(symbol);
  return Array.from(
    { length: count },
    (_, k) => SYMBOLS[(start + 1 + k) % SYMBOLS.length],
  );
}

function randomSymbol(): SlotSymbol {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

/** Лента для вращения: STRIP_LENGTH случайных иконок. Вызывается из обработчика клика. */
function randomStrip(): SlotSymbol[] {
  return Array.from({ length: STRIP_LENGTH }, randomSymbol);
}

const CELL = "flex aspect-square w-full items-center justify-center";

/**
 * Настоящая вертикальная лента. Ячейки квадратные и такой же ширины, как окно
 * барабана, поэтому высота ячейки == высоте окна, а проценты в translateY
 * считаются от высоты ленты. Вся анимация — CSS (transform), React не
 * перерисовывает барабан на каждый кадр.
 *
 *  - `spinning`: лента из STRIP_LENGTH случайных иконок (в двух копиях для
 *    бесшовного цикла) бежит сверху вниз с вертикальным размытием и
 *    затуханием у краёв окна;
 *  - иначе: лента [запас, ИТОГ, f1, f2, f3]. Если `settle` — она «доезжает»
 *    сверху на итоговый символ с перелётом и пружиной (keyframes `reel-settle`).
 */
function Reel({
  symbol,
  spinning,
  strip,
  settle,
  index,
}: {
  symbol: SlotSymbol;
  spinning: boolean;
  strip: readonly SlotSymbol[];
  settle: boolean;
  index: number;
}) {
  // Лента остановки: запас сверху нужен, чтобы при перелёте не показать пустоту.
  const [f1, f2, f3] = nextSymbols(symbol, 3);
  const stopStrip = [f3, symbol, f1, f2, f3];

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-xl bg-zinc-950 text-5xl ring-1 ring-cyan-400/30 sm:text-6xl ${
        spinning ? "reel-window-spinning ring-cyan-400/60" : ""
      }`}
    >
      {spinning ? (
        <div
          className="reel-spin absolute inset-x-0 top-0"
          // Чуть разная скорость барабанов выглядит естественнее
          style={
            { "--reel-duration": `${0.55 + index * 0.06}s` } as CSSProperties
          }
        >
          {[...strip, ...strip].map((s, i) => (
            <div key={i} className={CELL}>
              {s}
            </div>
          ))}
        </div>
      ) : (
        // top: -100% — первая (запасная) ячейка над окном, итоговая в окне
        <div
          className={`absolute inset-x-0 top-[-100%] ${settle ? "reel-settle" : ""}`}
        >
          {stopStrip.map((s, i) => (
            <div key={i} className={CELL}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Автомат ----------------------------------------------------------------

interface RoundResult {
  bet: Bet;
  payout: number;
  multiplier: number;
}

interface SlotMachineProps {
  /** Баланс, прочитанный сервером; дальше источником правды остаётся сервер. */
  initialBalance: number;
  initialHistory: readonly SpinRecord[];
}

export function SlotMachine({
  initialBalance,
  initialHistory,
}: SlotMachineProps) {
  // Баланс живёт в общем store, чтобы шапка сайта показывала то же значение.
  const balance = useBalance(initialBalance);
  const [bet, setBet] = useState<Bet>(BET_OPTIONS[0]);
  // Константа, а не random — чтобы не было hydration mismatch.
  const [reels, setReels] = useState<Reels>(["🍒", "🍋", "🔔"]);
  const [reelSpinning, setReelSpinning] = useState<boolean[]>(
    Array(REEL_COUNT).fill(false),
  );
  // Ленты вращения: на SSR — детерминированные, новые случайные на каждый спин.
  const [strips, setStrips] = useState<SlotSymbol[][]>(() =>
    Array.from({ length: REEL_COUNT }, (_, i) => [
      ...SYMBOLS.slice(i),
      ...SYMBOLS.slice(0, i),
      ...SYMBOLS.slice(0, STRIP_LENGTH - SYMBOLS.length),
    ]),
  );
  // Пружину остановки играем только после реального спина, не при загрузке.
  const [hasSpun, setHasSpun] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<readonly SpinRecord[]>(initialHistory);

  const timerIds = useRef<number[]>([]);
  // Защита от setState/таймеров после ухода со страницы, пока Server Action в полёте.
  const alive = useRef(true);

  const clearTimers = useCallback(() => {
    for (const id of timerIds.current) window.clearTimeout(id);
    timerIds.current = [];
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  const canSpin = !spinning && balance >= bet;
  const isBroke = !spinning && balance < BET_OPTIONS[0];

  const spin = useCallback(async () => {
    if (!canSpin) return;

    setError(null);
    setResult(null);
    setSpinning(true);
    setHasSpun(true);
    setStrips(Array.from({ length: REEL_COUNT }, randomStrip));
    setReelSpinning(Array(REEL_COUNT).fill(true));
    // Оптимистично показываем списание; финальное значение придёт с сервера.
    adjustBalance(-bet, initialBalance);

    const startedAt = Date.now();

    let response: SpinResponse | null;
    try {
      response = await spinAction(bet);
    } catch {
      response = null; // сеть/сервер недоступны
    }

    if (!alive.current) return;

    if (!response || !response.ok) {
      setReelSpinning(Array(REEL_COUNT).fill(false));
      if (response) {
        setBalance(response.balance);
        setError(ERROR_MESSAGES[response.error]);
      } else {
        adjustBalance(bet, initialBalance); // откат оптимистичного списания
        setError(ERROR_MESSAGES.NETWORK);
      }
      setSpinning(false);
      return;
    }

    const { reels: finalReels, balance: serverBalance, record } = response;
    const lead = Math.max(0, MIN_SPIN_MS - (Date.now() - startedAt));

    // Останавливаем барабаны по очереди слева направо.
    finalReels.forEach((symbol, i) => {
      const stop = window.setTimeout(() => {
        setReels((prev) => prev.map((s, idx) => (idx === i ? symbol : s)));
        setReelSpinning((prev) => prev.map((v, idx) => (idx === i ? false : v)));

        // Баланс, результат и история обновляются только после остановки
        // последнего барабана — чтобы не «спойлерить» исход заранее.
        if (i === REEL_COUNT - 1) {
          setBalance(serverBalance);
          setResult({
            bet: response.bet,
            payout: response.payout,
            multiplier: response.multiplier,
          });
          setHistory((prev) => [record, ...prev].slice(0, HISTORY_LIMIT));
          setSpinning(false);
        }
      }, lead + i * STOP_STEP_MS);
      timerIds.current.push(stop);
    });
  }, [bet, canSpin, initialBalance]);

  const reset = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const { balance: fresh } = await resetWallet();
      if (!alive.current) return;
      setBalance(fresh);
      setBet(BET_OPTIONS[0]);
    } catch {
      if (alive.current) setError(ERROR_MESSAGES.NETWORK);
    }
  }, []);

  return (
    <>
      <section
        aria-label="Игровой автомат"
        className="mx-auto w-full max-w-xl rounded-3xl border border-fuchsia-500/40 bg-zinc-900/80 p-6 shadow-[0_0_60px_-10px_rgba(217,70,239,0.5)] sm:p-8"
      >
        {/* Баланс */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm uppercase tracking-widest text-zinc-400">
            Баланс
          </span>
          <span className="font-mono text-2xl font-bold text-lime-300">
            {formatMoney(balance)}
          </span>
        </div>

        {/* Барабаны */}
        <div
          className="grid grid-cols-3 gap-3 rounded-2xl bg-black/60 p-4 ring-1 ring-cyan-400/40"
          role="img"
          aria-label={`Барабаны: ${reels.join(" ")}`}
        >
          {reels.map((symbol, i) => (
            <Reel
              key={i}
              index={i}
              symbol={symbol}
              spinning={reelSpinning[i]}
              strip={strips[i]}
              settle={hasSpun}
            />
          ))}
          {/* Вертикальное размытие (только по Y) для движущейся ленты */}
          <svg width="0" height="0" aria-hidden className="absolute">
            <filter id="reel-vblur" x="0" y="-20%" width="100%" height="140%">
              <feGaussianBlur stdDeviation="0 5" />
            </filter>
          </svg>
        </div>

        {/* Результат / ошибка: aria-live, чтобы скринридер озвучил итог */}
        <p
          aria-live="polite"
          className="my-5 min-h-7 text-center text-lg font-semibold"
        >
          {spinning && <span className="text-zinc-400">Вращаем…</span>}
          {!spinning && error && <span className="text-amber-400">{error}</span>}
          {!spinning && !error && result && result.payout > 0 && (
            <span className="text-lime-300">
              Выигрыш {formatMoney(result.payout)} (x{result.multiplier})
            </span>
          )}
          {!spinning && !error && result && result.payout === 0 && (
            <span className="text-rose-400">
              Не повезло: −{formatMoney(result.bet)}
            </span>
          )}
        </p>

        {/* Выбор ставки */}
        <fieldset disabled={spinning} className="mb-5">
          <legend className="mb-2 text-sm uppercase tracking-widest text-zinc-400">
            Ставка
          </legend>
          <div className="grid grid-cols-3 gap-3">
            {BET_OPTIONS.map((option) => {
              const selected = option === bet;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  disabled={option > balance && !selected}
                  onClick={() => setBet(option)}
                  className={`rounded-xl border px-4 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? "border-cyan-400 bg-cyan-400/15 text-cyan-200 shadow-[0_0_16px_-2px_rgba(34,211,238,0.6)]"
                      : "border-white/10 text-zinc-300 hover:border-cyan-400/60"
                  }`}
                >
                  ${option}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* SPIN / сброс */}
        {isBroke ? (
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-2xl bg-zinc-700 py-4 text-xl font-extrabold tracking-widest text-white transition hover:bg-zinc-600"
          >
            Баланс исчерпан — начать заново
          </button>
        ) : (
          <button
            type="button"
            onClick={spin}
            disabled={!canSpin}
            className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-4 text-xl font-extrabold tracking-widest text-zinc-950 shadow-[0_0_30px_-4px_rgba(217,70,239,0.7)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {spinning ? "SPINNING…" : "SPIN"}
          </button>
        )}

        <p className="mt-4 text-center text-xs text-zinc-500">
          3 одинаковых — x{MULTIPLIER_THREE}, 2 одинаковых — x{MULTIPLIER_TWO}.
          Демо-режим, виртуальные деньги.
        </p>
      </section>

      <SpinHistory records={history} />
    </>
  );
}
