import { GameCard } from "@/components/game-card";
import { popularGames } from "@/data/games";

export default function Home() {
  return (
    <main className="relative flex-1 overflow-hidden bg-zinc-950 text-zinc-100">
      {/* neon glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(60rem_30rem_at_20%_-10%,rgba(217,70,239,0.22),transparent),radial-gradient(50rem_30rem_at_90%_0%,rgba(34,211,238,0.16),transparent)]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Neon Casino
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Популярные{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              игры
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-zinc-400">
            Выбирайте слоты, рулетку и live-столы от лучших провайдеров.
          </p>
        </header>

        <section aria-label="Популярные игры">
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {popularGames.map((game, index) => (
              <li key={game.id}>
                <GameCard game={game} priority={index < 4} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
