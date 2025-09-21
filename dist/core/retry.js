export async function retry(fn, opts) {
    const retries = opts?.retries ?? 3;
    const base = opts?.baseMs ?? 300;
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        }
        catch (e) {
            attempt++;
            if (attempt > retries)
                throw e;
            const jitter = Math.random() * base;
            const backoff = base * (2 ** (attempt - 1)) + jitter;
            await new Promise(r => setTimeout(r, backoff));
        }
    }
}
