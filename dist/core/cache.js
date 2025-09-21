export class LRUCache {
    constructor(max = 200) {
        this.map = new Map();
        this.max = max;
    }
    get(key) {
        const e = this.map.get(key);
        if (!e)
            return undefined;
        this.map.delete(key);
        this.map.set(key, e);
        return e.value;
    }
    set(key, value) {
        if (this.map.has(key))
            this.map.delete(key);
        this.map.set(key, { key, value, ts: Date.now() });
        if (this.map.size > this.max) {
            const firstKey = this.map.keys().next().value;
            if (firstKey)
                this.map.delete(firstKey);
        }
    }
    has(key) { return this.map.has(key); }
}
