import { SlotMachine } from "@/components/slot-machine";
import { readBalance, readHistory } from "@/lib/wallet";

/**
 * Server Component: читает баланс и историю из серверного кошелька (по
 * httpOnly-cookie) и передаёт их клиентскому автомату как начальные значения.
 * Обращение к cookies() делает компонент динамическим, поэтому в странице он
 * обёрнут в <Suspense> — остальная оболочка страницы остаётся статической.
 */
export async function SlotMachineLoader() {
  const [balance, history] = await Promise.all([readBalance(), readHistory()]);
  return <SlotMachine initialBalance={balance} initialHistory={history} />;
}
