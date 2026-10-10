import { useSyncExternalStore } from "react";

/**
 * Крошечное клиентское хранилище баланса для UI.
 *
 * Зачем: шапка сайта (в layout) и автомат (в странице) — разные поддеревья,
 * а layout не перерисовывается при навигации. Общий store позволяет им видеть
 * один и тот же баланс без prop drilling и без тяжёлого state-менеджера.
 *
 * Это только ОТОБРАЖЕНИЕ. Источник правды — серверный кошелёк; сюда попадают
 * значения, которые вернул Server Action (либо оптимистичная дельта на время спина).
 */

let current: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setBalance(value: number) {
  current = value;
  emit();
}

/** Относительное изменение; `fallback` — серверное значение, если store ещё пуст. */
export function adjustBalance(delta: number, fallback: number) {
  current = (current ?? fallback) + delta;
  emit();
}

/**
 * `fallback` — баланс, прочитанный сервером при рендере. Пока клиент ничего не
 * записал в store (первый рендер, гидрация), показывается он.
 */
export function useBalance(fallback: number): number {
  return useSyncExternalStore(
    subscribe,
    () => current ?? fallback,
    () => fallback,
  );
}
