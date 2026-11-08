/** Aleatório determinístico por hash: o mesmo (seed, sala, tick) sempre dá o mesmo valor. */
export function hash01(...n: number[]): number {
  let h = 2166136261 ^ 0x9e3779b9;
  for (const v of n) {
    h = Math.imul(h ^ (v | 0), 16777619);
    h ^= h >>> 15;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 16), 2654435761);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

export function gauss(...n: number[]): number {
  const u1 = Math.max(1e-9, hash01(...n, 1));
  const u2 = hash01(...n, 2);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}