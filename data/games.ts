import type { Game, GameCategory } from "@/types/game";

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  slots: "Слоты",
  roulette: "Рулетка",
  blackjack: "Блэкджек",
  live: "Live",
  crash: "Crash",
};

export const popularGames: readonly Game[] = [
  { id: "neon-fruits", title: "Neon Fruits", category: "slots", image: "/games/neon-fruits.svg", provider: "NovaPlay", rating: 4.8 },
  { id: "cyber-roulette", title: "Cyber Roulette", category: "roulette", image: "/games/cyber-roulette.svg", provider: "VoltGaming", rating: 4.7 },
  { id: "gates-of-neon", title: "Gates of Neon", category: "slots", image: "/games/gates-of-neon.svg", provider: "NovaPlay", rating: 4.9 },
  { id: "blackjack-vip", title: "Blackjack VIP", category: "blackjack", image: "/games/blackjack-vip.svg", provider: "Royal Table", rating: 4.5 },
  { id: "rocket-crash", title: "Rocket Crash", category: "crash", image: "/games/rocket-crash.svg", provider: "Orbit Labs", rating: 4.6 },
  { id: "live-lightning", title: "Live Lightning Roulette", category: "live", image: "/games/live-lightning.svg", provider: "Studio 9", rating: 4.9 },
  { id: "pharaoh-gold", title: "Pharaoh's Gold", category: "slots", image: "/games/pharaoh-gold.svg", provider: "Sandstone", rating: 4.4 },
  { id: "midnight-blackjack", title: "Midnight Blackjack", category: "live", image: "/games/midnight-blackjack.svg", provider: "Studio 9", rating: 4.6 },
];
