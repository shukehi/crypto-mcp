type Entry<T> = { key: string; value: T; ts: number };
export class LRUCache<T=any> {
  private max: number;
  private map: Map<string, Entry<T>> = new Map();
  constructor(max = 200) { this.max = max; }
  get(key: string): T|undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }
  set(key: string, value: T) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { key, value, ts: Date.now() });
    if (this.map.size > this.max) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }
  has(key: string) { return this.map.has(key); }
}
