// Visual-only atmospheric presets. Mechanics are exclusively server-owned.
// Values are static to keep CSS gradients safe and make future art replacement easy.
export const BATTLE_THEMES = [
  {
    "world": 1,
    "biome": "forest",
    "light": "#b4fff1",
    "accent": "#4cc8b7",
    "shadow": "#103b47",
    "weather": "motes"
  },
  {
    "world": 2,
    "biome": "gem",
    "light": "#b2f4ff",
    "accent": "#f5c264",
    "shadow": "#213d60",
    "weather": "motes"
  },
  {
    "world": 3,
    "biome": "desert",
    "light": "#ffe8a6",
    "accent": "#f6ad63",
    "shadow": "#65492a",
    "weather": "dust"
  },
  {
    "world": 4,
    "biome": "sky",
    "light": "#d5d7ff",
    "accent": "#aec1fa",
    "shadow": "#353e80",
    "weather": "motes"
  },
  {
    "world": 5,
    "biome": "snow",
    "light": "#e4ffff",
    "accent": "#a2eafa",
    "shadow": "#294e69",
    "weather": "snow"
  },
  {
    "world": 6,
    "biome": "lava",
    "light": "#ffe3a5",
    "accent": "#ff743d",
    "shadow": "#56302a",
    "weather": "embers"
  },
  {
    "world": 7,
    "biome": "jungle",
    "light": "#d1ffd2",
    "accent": "#6dde8a",
    "shadow": "#184b33",
    "weather": "motes"
  },
  {
    "world": 8,
    "biome": "ocean",
    "light": "#b7f7ff",
    "accent": "#3cc7e0",
    "shadow": "#154d6d",
    "weather": "bubbles"
  },
  {
    "world": 9,
    "biome": "storm",
    "light": "#d2d4ff",
    "accent": "#aa92ff",
    "shadow": "#302d6a",
    "weather": "motes"
  },
  {
    "world": 10,
    "biome": "volcano",
    "light": "#ffcc81",
    "accent": "#f75b36",
    "shadow": "#642b23",
    "weather": "embers"
  },
  {
    "world": 11,
    "biome": "tundra",
    "light": "#efffff",
    "accent": "#a7e1fb",
    "shadow": "#436d86",
    "weather": "snow"
  },
  {
    "world": 12,
    "biome": "eclipse",
    "light": "#ddceff",
    "accent": "#aa7aff",
    "shadow": "#2f2858",
    "weather": "motes"
  },
  {
    "world": 13,
    "biome": "marsh",
    "light": "#d9ff9e",
    "accent": "#78dab3",
    "shadow": "#2e594c",
    "weather": "motes"
  },
  {
    "world": 14,
    "biome": "meteor",
    "light": "#ffdeae",
    "accent": "#ffaa7b",
    "shadow": "#553e65",
    "weather": "dust"
  },
  {
    "world": 15,
    "biome": "star-sea",
    "light": "#def6ff",
    "accent": "#83abff",
    "shadow": "#2b427b",
    "weather": "bubbles"
  },
  {
    "world": 16,
    "biome": "mirror",
    "light": "#f8efff",
    "accent": "#a3d9e8",
    "shadow": "#4e5c85",
    "weather": "motes"
  },
  {
    "world": 17,
    "biome": "cave",
    "light": "#baf5ff",
    "accent": "#8cdfff",
    "shadow": "#214b66",
    "weather": "motes"
  },
  {
    "world": 18,
    "biome": "factory",
    "light": "#ffe8c5",
    "accent": "#f0b75b",
    "shadow": "#3c4c63",
    "weather": "dust"
  },
  {
    "world": 19,
    "biome": "sand-citadel",
    "light": "#fbe6ba",
    "accent": "#e2a56e",
    "shadow": "#715439",
    "weather": "dust"
  },
  {
    "world": 20,
    "biome": "moon",
    "light": "#dbe8ff",
    "accent": "#c6c0fc",
    "shadow": "#313d70",
    "weather": "motes"
  },
  {
    "world": 21,
    "biome": "reef",
    "light": "#edffc7",
    "accent": "#69d9df",
    "shadow": "#1f6772",
    "weather": "bubbles"
  },
  {
    "world": 22,
    "biome": "aurora",
    "light": "#b8ffed",
    "accent": "#83aae9",
    "shadow": "#264b72",
    "weather": "snow"
  }
];
export function battleTheme(worldId){
  const index=Math.max(0,Math.min(21,Number(worldId||1)-1));
  return BATTLE_THEMES[index];
}
// Future optional artist-produced assets can replace the existing map background
// through this single mapping without touching questions, HP, or rewards.
export function battleBackground(worldId){
  const index=Math.max(1,Math.min(22,Number(worldId||1)));
  return '/ic3-scenes/map-'+index+'.webp';
}
