import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SlotMachineLoader } from "@/components/slot-machine-loader";
import { CATEGORY_LABELS, popularGames } from "@/data/games";
import type { Game } from "@/types/game";

function findGame(id: string): Game | undefined {
  return popularGames.find((game) => game.id === id);
}

// Предгенерируем страницу для каждой игры на этапе сборки (как статический HTML).
export function generateStaticParams() {
  return popularGames.map(({ id }) => ({ id }));
}

export async function generateMetadata(
  props: PageProps<"/games/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const game = findGame(id);
  return { title: game ? `${game.title} — Neon Casino` : "Игра не найдена" };
}

// Server Component: находит игру и рендерит «рамку» страницы.
// Баланс читает серверный <SlotMachineLoader />, UI — клиентский <SlotMachine />.
export default async function GamePage(props: PageProps<"/games/[id]">) {
  // В этой версии Next.js params — это Promise.
  const { id } = await props.params;
  const game = findGame(id);

  if (!game) notFound();

  return (
    <main className="relative flex-1 overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_20%_-10%,rgba(217,70,239,0.22),transparent),radial-gradient(50rem_30rem_at_90%_0%,rgba(34,211,238,0.16),transparent)]"
      />

      <div className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="text-sm text-cyan-300 transition hover:text-cyan-200"
        >
          ← Все игры
        </Link>

        <header className="mb-8 mt-4">
          <p className="text-sm uppercase tracking-[0.25em] text-fuchsia-300">
            {CATEGORY_LABELS[game.category]} · {game.provider}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            {game.title}
          </h1>
        </header>

        {game.category === "slots" ? (
          <Suspense
            fallback={
              <div className="mx-auto h-96 max-w-xl animate-pulse rounded-3xl bg-zinc-900/80" />
            }
          >
            <SlotMachineLoader />
          </Suspense>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-zinc-900/70 p-8 text-center text-zinc-400">
            Эта игра скоро появится. Попробуйте слоты!
          </p>
        )}
      </div>
    </main>
  );
}
