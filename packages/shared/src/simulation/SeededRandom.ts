/**
 * Deterministic PRNG implementation (Mulberry32).
 * Guarantees 100% reproducible random sequences across runs given the same 32-bit seed.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a deterministic pseudo-random float in [0, 1).
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a deterministic integer in [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Returns a deterministic float in [min, max).
   */
  public nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  public getSeed(): number {
    return this.state;
  }
}
