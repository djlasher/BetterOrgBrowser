/** Bound CLI process concurrency when users expand many roots at once. */
export class TaskQueue {
    private active = 0;
    private readonly waiting: Array<() => void> = [];
    constructor(private readonly limit = 3) {}
    async run<T>(action: () => Promise<T>): Promise<T> {
        if (this.active >= this.limit) { await new Promise<void>(resolve => this.waiting.push(resolve)); }
        else { this.active++; }
        try { return await action(); }
        finally {
            const next = this.waiting.shift();
            if (next) { next(); } else { this.active--; }
        }
    }
}
