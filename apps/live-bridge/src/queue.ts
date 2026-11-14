import fs from 'node:fs';
import path from 'node:path';

export interface QueuedEventRecord {
  id: string; // Unique providerEventId or eventKey
  eventType: 'COMMENT' | 'GIFT';
  payload: any;
  createdAt: number;
  retryCount: number;
  lastAttemptAt?: number;
  lastError?: string;
  status: 'PENDING' | 'IN_FLIGHT' | 'ACKED' | 'DEAD_LETTER';
}

export interface DurableQueueOptions {
  storageFile?: string;
  deadLetterFile?: string;
  maxQueueSize?: number;
  maxRetries?: number;
}

/**
 * P0.1 (Phase 08.2): Durable Event Queue cho Live Bridge
 * Bảo đảm mọi event nhận được từ adapter đều được ghi nhận bền vững trên đĩa.
 * Chống mất event khi server tạm ngắt kết nối, gặp HTTP timeout hoặc tiến trình Bridge bị crash.
 */
export class DurableEventQueue {
  private queue: QueuedEventRecord[] = [];
  private deadLetters: QueuedEventRecord[] = [];
  private storageFile: string;
  private deadLetterFile: string;
  private maxQueueSize: number;
  private maxRetries: number;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor(opts: DurableQueueOptions = {}) {
    const defaultDataDir = path.resolve(process.cwd(), '.data');
    this.storageFile = opts.storageFile || path.join(defaultDataDir, 'bridge_event_queue.json');
    this.deadLetterFile = opts.deadLetterFile || path.join(defaultDataDir, 'bridge_dead_letter.json');
    this.maxQueueSize = opts.maxQueueSize || 1000;
    this.maxRetries = opts.maxRetries || 5;

    this.ensureDirs();
    this.loadFromDisk();
  }

  private ensureDirs(): void {
    try {
      const storageDir = path.dirname(this.storageFile);
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      const dlDir = path.dirname(this.deadLetterFile);
      if (!fs.existsSync(dlDir)) {
        fs.mkdirSync(dlDir, { recursive: true });
      }
    } catch {}
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Bất kỳ event nào còn ở trạng thái IN_FLIGHT khi khởi động lại đều reset về PENDING
          this.queue = parsed.map((item: QueuedEventRecord) => ({
            ...item,
            status: item.status === 'IN_FLIGHT' ? 'PENDING' : item.status,
          })).filter((item: QueuedEventRecord) => item.status === 'PENDING');
        }
      }
    } catch (err: any) {
      console.warn(`[QUEUE] Error loading persistent queue from ${this.storageFile}: ${err.message}`);
      this.queue = [];
    }

    try {
      if (fs.existsSync(this.deadLetterFile)) {
        const raw = fs.readFileSync(this.deadLetterFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.deadLetters = parsed;
        }
      }
    } catch {
      this.deadLetters = [];
    }
  }

  public persistSync(): void {
    try {
      this.ensureDirs();
      const pendingItems = this.queue.filter((q) => q.status === 'PENDING' || q.status === 'IN_FLIGHT');
      fs.writeFileSync(this.storageFile, JSON.stringify(pendingItems, null, 2), 'utf-8');
      if (this.deadLetters.length > 0) {
        fs.writeFileSync(this.deadLetterFile, JSON.stringify(this.deadLetters, null, 2), 'utf-8');
      }
    } catch (err: any) {
      console.error(`[QUEUE] Failed to persist queue to disk: ${err.message}`);
    }
  }

  private schedulePersist(): void {
    if (this.saveDebounceTimer) return;
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      this.persistSync();
    }, 50);
  }

  public enqueue(record: Omit<QueuedEventRecord, 'createdAt' | 'retryCount' | 'status'>): boolean {
    // 1. Kiểm tra giới hạn queue (Backpressure)
    if (this.queue.length >= this.maxQueueSize) {
      return false;
    }

    // 2. Chống enqueue trùng cùng event ID đã tồn tại trong queue
    const existing = this.queue.find((q) => q.id === record.id);
    if (existing) {
      return true; // Idempotent duplicate
    }

    const item: QueuedEventRecord = {
      ...record,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    };

    this.queue.push(item);
    this.schedulePersist();
    return true;
  }

  public peekPending(): QueuedEventRecord | null {
    return this.queue.find((q) => q.status === 'PENDING') || null;
  }

  public markInFlight(id: string): void {
    const item = this.queue.find((q) => q.id === id);
    if (item) {
      item.status = 'IN_FLIGHT';
      item.lastAttemptAt = Date.now();
    }
  }

  public markAcked(id: string): void {
    const idx = this.queue.findIndex((q) => q.id === id);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      this.schedulePersist();
    }
  }

  public markFailed(id: string, error: string): void {
    const item = this.queue.find((q) => q.id === id);
    if (!item) return;

    item.retryCount++;
    item.lastError = error;
    item.lastAttemptAt = Date.now();

    if (item.retryCount >= this.maxRetries) {
      // Vượt quá số lần thử tối đa -> Chuyển vào Dead-Letter Queue
      item.status = 'DEAD_LETTER';
      const idx = this.queue.indexOf(item);
      if (idx !== -1) {
        this.queue.splice(idx, 1);
      }
      this.deadLetters.push(item);
      console.error(`[QUEUE DLQ] Event ${id} exhausted max retries (${this.maxRetries}). Moved to Dead-Letter Queue: ${error}`);
    } else {
      // Đưa trở lại PENDING để chờ retry lần sau
      item.status = 'PENDING';
    }

    this.schedulePersist();
  }

  public getQueueLength(): number {
    return this.queue.filter((q) => q.status === 'PENDING' || q.status === 'IN_FLIGHT').length;
  }

  public getDeadLetterCount(): number {
    return this.deadLetters.length;
  }

  public getAllPending(): QueuedEventRecord[] {
    return this.queue.filter((q) => q.status === 'PENDING' || q.status === 'IN_FLIGHT');
  }

  public clear(): void {
    this.queue = [];
    this.deadLetters = [];
    try {
      if (fs.existsSync(this.storageFile)) fs.unlinkSync(this.storageFile);
      if (fs.existsSync(this.deadLetterFile)) fs.unlinkSync(this.deadLetterFile);
    } catch {}
  }
}
