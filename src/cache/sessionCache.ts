/** Promise caching coalesces concurrent requests. Failed work is retryable. */
export class SessionCache<T> {
    private readonly entries = new Map<string, Promise<T>>();
    constructor(private readonly log: (message: string) => void = () => undefined) {}
    get(key: string, load: () => Promise<T>): Promise<T> {
        const existing = this.entries.get(key);
        this.log(`[Cache ${existing ? 'HIT' : 'MISS'}] ${key}`);
        if (existing) { return existing; }
        const pending = Promise.resolve().then(load).then(value => {
            if (this.entries.get(key) === pending) { this.log(`[Cache STORE] ${key}`); }
            return value;
        }).catch(error => {
            if (this.entries.get(key) === pending) { this.entries.delete(key); }
            throw error;
        });
        this.entries.set(key, pending);
        return pending;
    }
    clear(): void { this.entries.clear(); this.log('Cache cleared.'); }
}
