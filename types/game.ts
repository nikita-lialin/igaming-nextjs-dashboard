export type GameCategory = "slots" | "roulette" | "blackjack" | "live" | "crash";

export interface Game {
  id: string;
  title: string;
  category: GameCategory;
  /** Path under /public or an absolute URL (remote hosts must be allowed in next.config). */
  image: string;
  provider: string;
  /** 0–5, one decimal. */
  rating: number;
}
