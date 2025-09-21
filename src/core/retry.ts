export async function retry<T>(fn: ()=>Promise<T>, opts?: { retries?: number, baseMs?: number }) {
  const retries = opts?.retries ?? 3;
  const base = opts?.baseMs ?? 300;
  let attempt = 0;
  while (true) {
    try { return await fn(); }
    catch (e) {
      attempt++;
      if (attempt > retries) throw e;
      const jitter = Math.random() * base;
      const backoff = base * (2 ** (attempt-1)) + jitter;
      await new Promise(r => setTimeout(r, backoff));
    }
  }
}
