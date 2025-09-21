export class RateLimiter {
  private capacity: number;
  private tokens: number;
  private refillRate: number; // tokens per second
  private last: number;
  constructor(capacity=10, refillRate=10) {
    this.capacity = capacity; this.tokens = capacity;
    this.refillRate = refillRate; this.last = Date.now();
  }
  async removeToken(): Promise<void> {
    while (true) {
      const now = Date.now();
      const delta = (now - this.last) / 1000;
      this.last = now;
      this.tokens = Math.min(this.capacity, this.tokens + delta * this.refillRate);
      if (this.tokens >= 1) { this.tokens -= 1; return; }
      await new Promise(r => setTimeout(r, 100));
    }
  }
}
