type SendFn<T> = (items: T[]) => Promise<void>;

const MAX_BUFFER = 1000;
const MAX_RETRIES = 5;

export class TraceBuffer<T> {
  private buffer: T[] = [];
  private timer: ReturnType<typeof setInterval>;
  private retryCount = 0;

  constructor(
    private sendFn: SendFn<T>,
    private batchSize = 10,
    private flushInterval = 3000,
  ) {
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  add(item: T) {
    this.buffer.push(item);

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  addMany(items: T[]) {
    this.buffer.push(...items);

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.batchSize);

    try {
      await this.sendFn(batch);
      this.retryCount = 0;
    } catch (err) {
      console.error("flush error:", err);

      this.retryCount++;
      if (this.retryCount >= MAX_RETRIES) {
        console.error("Max retries reached. Clearing buffer.");

        // drop everything
        this.buffer = [];
        this.retryCount = 0;
        return;
      }

      // put back (preserve order)
      this.buffer.unshift(...batch);
    }
  }

  size() {
    return this.buffer.length;
  }

  stop() {
    clearInterval(this.timer);
  }
}