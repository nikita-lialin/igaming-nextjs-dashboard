import Link from "next/link";
import { Suspense } from "react";
import { BalanceBadge } from "@/components/balance-badge";
import { readBalance } from "@/lib/wallet";

/** Server Component: читает баланс из cookie-сессии и отдаёт клиентскому бейджу. */
async function HeaderBalance() {
  return <BalanceBadge initialBalance={await readBalance()} />;
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-extrabold tracking-tight text-white"
        >
          <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
            Neon
          </span>{" "}
          Casino
        </Link>

        {/* cookies() — динамические данные, поэтому Suspense: оболочка шапки статична. */}
        <Suspense
          fallback={
            <span className="h-8 w-32 animate-pulse rounded-full bg-zinc-800" />
          }
        >
          <HeaderBalance />
        </Suspense>
      </div>
    </header>
  );
}
