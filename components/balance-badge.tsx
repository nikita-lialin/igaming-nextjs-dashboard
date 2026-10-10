"use client";

import { useBalance } from "@/lib/balance-store";
import { formatMoney } from "@/lib/format";

/** Клиентский остров в шапке: подписан на общий store, поэтому «живой». */
export function BalanceBadge({ initialBalance }: { initialBalance: number }) {
  const balance = useBalance(initialBalance);
  return (
    <span className="flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1.5 font-mono text-sm font-bold text-lime-300">
      <span className="text-xs font-medium uppercase tracking-widest text-lime-200/70">
        Баланс
      </span>
      {formatMoney(balance)}
    </span>
  );
}
