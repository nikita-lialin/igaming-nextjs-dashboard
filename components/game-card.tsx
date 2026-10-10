import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABELS } from "@/data/games";
import type { Game } from "@/types/game";

interface GameCardProps {
  game: Game;
  /** Pass true for above-the-fold cards to preload the image. */
  priority?: boolean;
}

export function GameCard({ game, priority = false }: GameCardProps) {
  return (
    <Link
      href={`/games/${game.id}`}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 transition duration-300 hover:-translate-y-1 hover:border-fuchsia-500/60 hover:shadow-[0_0_30px_-4px_rgba(217,70,239,0.55)] focus-visible:outline-2 focus-visible:outline-cyan-400"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={game.image}
          alt={game.title}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-cyan-300 ring-1 ring-cyan-400/40 backdrop-blur">
          {CATEGORY_LABELS[game.category]}
        </span>
      </div>

      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white">{game.title}</h3>
          <p className="truncate text-sm text-zinc-400">{game.provider}</p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-lime-300"
          aria-label={`Рейтинг ${game.rating} из 5`}
        >
          <span aria-hidden>★</span>
          {game.rating.toFixed(1)}
        </span>
      </div>
    </Link>
  );
}
