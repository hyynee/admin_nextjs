/**
 * Seed ids are `prefix-1`, `prefix-2`, ... so runtime ids start well above
 * that range to guarantee they can never collide with seeded records.
 */
let sequence = 1000;

export function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

/** Reset between tests so id generation is deterministic. */
export function resetIdSequence(): void {
  sequence = 1000;
}

/**
 * Deterministic PRNG (mulberry32). Mock data must be byte-identical on the
 * server and the client, otherwise SSR and hydration disagree.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)] as T;
}
