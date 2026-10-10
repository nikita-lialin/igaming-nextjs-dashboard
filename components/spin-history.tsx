import { formatMoney } from "@/lib/format";
import type { SpinRecord } from "@/lib/slot-game";

/**
 * Список последних спинов (новые сверху). Чисто презентационный компонент.
 * Отдельного 'use client' не нужен: он импортируется из клиентского автомата.
 */
export function SpinHistory({ records }: { records: readonly SpinRecord[] }) {
  return (
    <section
      aria-label="История спинов"
      className="mx-auto mt-6 w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6"
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-400">
        Последние спины
      </h2>

      {records.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          Пока нет спинов — нажмите SPIN.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="pb-2 pr-3 font-medium">Время</th>
                <th className="pb-2 pr-3 font-medium">Ставка</th>
                <th className="pb-2 pr-3 font-medium">Символы</th>
                <th className="pb-2 text-right font-medium">Итог</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const net = record.payout - record.bet;
                const won = record.payout > 0;
                return (
                  <tr key={record.id} className="row-in border-t border-white/5">
                    <td className="py-2 pr-3 font-mono text-zinc-400">
                      {/* Часовой пояс сервера и браузера может отличаться */}
                      <time
                        dateTime={new Date(record.at).toISOString()}
                        suppressHydrationWarning
                      >
                        {new Date(record.at).toLocaleTimeString("ru-RU")}
                      </time>
                    </td>
                    <td className="py-2 pr-3 font-mono text-zinc-200">
                      {formatMoney(record.bet)}
                    </td>
                    <td className="py-2 pr-3 text-lg tracking-widest">
                      {record.reels.join(" ")}
                    </td>
                    <td
                      className={`py-2 text-right font-mono font-semibold ${
                        won ? "text-lime-300" : "text-rose-400"
                      }`}
                    >
                      {net > 0 ? "+" : net < 0 ? "−" : ""}
                      {formatMoney(Math.abs(net))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
