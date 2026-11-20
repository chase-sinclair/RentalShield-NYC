export function publicCache<T>(ttlMs: number, limit: number) {
  const stored = new Map<string, { expires: number; value: T }>();
  const pending = new Map<string, Promise<T>>();

  return function load(key: string, fetchValue: () => Promise<T>, usable: (value: T) => boolean = () => true) {
    const cached = stored.get(key);
    if (cached && cached.expires > Date.now()) return Promise.resolve(cached.value);
    stored.delete(key);
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;

    const request = fetchValue().then((value) => {
      if (usable(value)) {
        if (stored.size >= limit) {
          const oldest = stored.keys().next().value;
          if (oldest !== undefined) stored.delete(oldest);
        }
        stored.set(key, { expires: Date.now() + ttlMs, value });
      }
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  };
}
