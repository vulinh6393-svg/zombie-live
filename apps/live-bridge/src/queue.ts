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
  walFile?: string;
  deadLetterFile?: string;
  maxQueueSize?: number;
  maxRetries?: number;
  compactionThreshold?: number;
}

export type WalOperation =
  | { op: 'ENQUEUE'; id: string; eventType: 'COMMENT' | 'GIFT'; payload: any; createdAt: number; retryCount?: number }
  | { op: 'ACK'; id: string; timestamp: number }
  | { op: 'FAILED'; id: string; retryCount: number; lastError: string; timestamp: number }
  | { op: 'DLQ'; id: string; reason: string; timestamp: number };

/**
 * P0.1 (Final Reliability Gate): Truly Durable Write-Ahead Log (WAL) Queue cho Live Bridge
 * - Ghi đĩa tức thời (zero debounce window) với fsyncSync trước khi xác nhận enqueue thành công.
 * - Append-only WAL log line-by-line; phục hồi 100% sau crash hoặc restart bất ngờ.
 * - Fail-closed: Giữ nguyên file hỏng làm tài liệu điều tra (.bak), tuyệt đối không reset queue về [].
 * - Single-flight isolation: getAllPending() chỉ trả về PENDING (loại trừ IN_FLIGHT), ngăn chặn dispatch trùng lặp đồng thời.
 * - Dead-Letter Queue bền vững với quy trình replay thủ công.
 */
export class DurableEventQueue {
  private queue: Map<string, QueuedEventRecord> = new Map();
  private deadLetters: Map<string, QueuedEventRecord> = new Map();
  private inFlightIds: Set<string> = new Set();
  private walFile: string;
  private deadLetterFile: string;
  private maxQueueSize: number;
  private maxRetries: number;
  private walLineCount: number = 0;
  private compactionThreshold: number;

  constructor(opts: DurableQueueOptions = {}) {
    const defaultDataDir = path.resolve(process.cwd(), '.data');
    if (opts.walFile) {
      this.walFile = opts.walFile;
    } else if (opts.storageFile) {
      if (opts.storageFile.endsWith('.jsonl') || opts.storageFile.endsWith('.wal')) {
        this.walFile = opts.storageFile;
      } else if (opts.storageFile.endsWith('.json')) {
        this.walFile = opts.storageFile.replace(/\.json$/, '.wal.jsonl');
      } else {
        this.walFile = `${opts.storageFile}.wal.jsonl`;
      }
    } else {
      this.walFile = path.join(defaultDataDir, 'bridge_wal.jsonl');
    }

    this.deadLetterFile = opts.deadLetterFile || path.join(defaultDataDir, 'bridge_dead_letter.jsonl');
    this.maxQueueSize = opts.maxQueueSize || 1000;
    this.maxRetries = opts.maxRetries || 5;
    this.compactionThreshold = opts.compactionThreshold || 500;

    this.ensureDirs();
    this.loadFromDisk();
  }

  private ensureDirs(): void {
    try {
      const walDir = path.dirname(this.walFile);
      if (!fs.existsSync(walDir)) {
        fs.mkdirSync(walDir, { recursive: true });
      }
      const dlDir = path.dirname(this.deadLetterFile);
      if (!fs.existsSync(dlDir)) {
        fs.mkdirSync(dlDir, { recursive: true });
      }
    } catch {}
  }

  public getWalFilePath(): string {
    return this.walFile;
  }

  public getDeadLetterFilePath(): string {
    return this.deadLetterFile;
  }

  private appendWalSync(op: WalOperation): void {
    this.ensureDirs();
    const line = JSON.stringify(op) + '\n';
    const fd = fs.openSync(this.walFile, 'a');
    try {
      fs.writeSync(fd, line, null, 'utf-8');
      fs.fsyncSync(fd);
      this.walLineCount++;
    } finally {
      fs.closeSync(fd);
    }
  }

  private appendDeadLetterSync(item: QueuedEventRecord): void {
    try {
      this.ensureDirs();
      const line = JSON.stringify(item) + '\n';
      const fd = fs.openSync(this.deadLetterFile, 'a');
      try {
        fs.writeSync(fd, line, null, 'utf-8');
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
    } catch (err: any) {
      console.error(`[QUEUE DLQ WRITE ERROR] Failed to append to DLQ file: ${err.message}`);
    }
  }

  private loadFromDisk(): void {
    if (!fs.existsSync(this.walFile)) {
      return;
    }

    let raw = '';
    try {
      raw = fs.readFileSync(this.walFile, 'utf-8');
    } catch (err: any) {
      console.error(`[QUEUE FATAL] Cannot read WAL file ${this.walFile}: ${err.message}`);
      throw new Error(`QUEUE_READ_ERROR: ${err.message}`);
    }

    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    this.walLineCount = lines.length;

    let hasCorruptedLine = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        const op = JSON.parse(line) as WalOperation;
        if (op.op === 'ENQUEUE') {
          this.queue.set(op.id, {
            id: op.id,
            eventType: op.eventType,
            payload: op.payload,
            createdAt: op.createdAt,
            retryCount: op.retryCount || 0,
            status: 'PENDING',
          });
        } else if (op.op === 'ACK') {
          this.queue.delete(op.id);
        } else if (op.op === 'DLQ') {
          this.queue.delete(op.id);
        } else if (op.op === 'FAILED') {
          const item = this.queue.get(op.id);
          if (item) {
            item.retryCount = op.retryCount;
            item.lastError = op.lastError;
            item.status = 'PENDING';
          }
        }
      } catch (parseErr: any) {
        hasCorruptedLine = true;
        console.warn(`[QUEUE CORRUPTION DETECTED] Line ${i + 1} in WAL is corrupted: ${parseErr.message}`);
      }
    }

    // Fail-Closed: Nếu có dòng lỗi, sao lưu sang .bak để điều tra pháp chứng, KHÔNG xóa bộ nhớ
    if (hasCorruptedLine) {
      const corruptBak = `${this.walFile}.corrupt_${Date.now()}.bak`;
      try {
        fs.copyFileSync(this.walFile, corruptBak);
        console.warn(`[FORENSIC ARCHIVE] Corrupted WAL preserved at ${corruptBak}. Loaded ${this.queue.size} valid unacked events.`);
      } catch {}
    }

    // Tải DLQ entries
    if (fs.existsSync(this.deadLetterFile)) {
      try {
        const dlqRaw = fs.readFileSync(this.deadLetterFile, 'utf-8');
        const dlqLines = dlqRaw.split('\n').filter((l) => l.trim().length > 0);
        for (const l of dlqLines) {
          try {
            const item = JSON.parse(l);
            if (item && item.id) {
              this.deadLetters.set(item.id, item);
            }
          } catch {}
        }
      } catch {}
    }

    // Crash recovery: Bất kỳ item nào đang dở dang đều đặt lại PENDING để drain
    for (const item of this.queue.values()) {
      item.status = 'PENDING';
    }
    this.inFlightIds.clear();
  }

  public compactWALSync(): void {
    try {
      this.ensureDirs();
      const tempFile = `${this.walFile}.tmp_${Date.now()}`;
      const fd = fs.openSync(tempFile, 'w');
      try {
        for (const item of this.queue.values()) {
          const rec: WalOperation = {
            op: 'ENQUEUE',
            id: item.id,
            eventType: item.eventType,
            payload: item.payload,
            createdAt: item.createdAt,
            retryCount: item.retryCount,
          };
          fs.writeSync(fd, JSON.stringify(rec) + '\n', null, 'utf-8');
        }
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }

      fs.renameSync(tempFile, this.walFile);
      this.walLineCount = this.queue.size;
    } catch (err: any) {
      console.error(`[QUEUE COMPACT ERROR] Failed to compact WAL: ${err.message}`);
    }
  }

  public persistSync(): void {
    this.compactWALSync();
  }

  /**
   * Enqueue một event: Bắt buộc ghi WAL đĩa + fsync trước khi xác nhận thành công.
   * Nếu có lỗi ghi đĩa, ném lỗi hoặc trả về false thay vì nuốt lỗi.
   */
  public enqueue(record: Omit<QueuedEventRecord, 'createdAt' | 'retryCount' | 'status'>): boolean {
    // 1. Backpressure: Kiểm tra giới hạn queue
    if (this.queue.size >= this.maxQueueSize) {
      return false;
    }

    // 2. Chống duplicate: Nếu ID đã tồn tại trong queue, return true (idempotent)
    if (this.queue.has(record.id)) {
      return true;
    }

    const item: QueuedEventRecord = {
      ...record,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    };

    // 3. Write-Ahead Log: Bắt buộc ghi và fsync xuống đĩa TRƯỚC KHI xác nhận enqueue
    this.appendWalSync({
      op: 'ENQUEUE',
      id: item.id,
      eventType: item.eventType,
      payload: item.payload,
      createdAt: item.createdAt,
      retryCount: 0,
    });

    // 4. Chỉ đưa vào RAM sau khi ghi đĩa thành công
    this.queue.set(item.id, item);

    if (this.walLineCount >= this.compactionThreshold) {
      this.compactWALSync();
    }

    return true;
  }

  public peekPending(): QueuedEventRecord | null {
    for (const q of this.queue.values()) {
      if (q.status === 'PENDING' && !this.inFlightIds.has(q.id)) {
        return q;
      }
    }
    return null;
  }

  public markInFlight(id: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.status = 'IN_FLIGHT';
      item.lastAttemptAt = Date.now();
      this.inFlightIds.add(id);
    }
  }

  public isInFlight(id: string): boolean {
    return this.inFlightIds.has(id);
  }

  public markAcked(id: string): void {
    if (!this.queue.has(id)) return;
    this.inFlightIds.delete(id);
    this.appendWalSync({
      op: 'ACK',
      id,
      timestamp: Date.now(),
    });
    this.queue.delete(id);

    if (this.walLineCount >= this.compactionThreshold) {
      this.compactWALSync();
    }
  }

  public markFailed(id: string, error: string): void {
    const item = this.queue.get(id);
    if (!item) return;

    this.inFlightIds.delete(id);
    item.retryCount++;
    item.lastError = error;
    item.lastAttemptAt = Date.now();

    if (item.retryCount >= this.maxRetries) {
      // Vượt quá số lần retry -> Chuyển vào Dead-Letter Queue
      item.status = 'DEAD_LETTER';
      this.queue.delete(id);
      this.deadLetters.set(id, item);

      this.appendWalSync({
        op: 'DLQ',
        id,
        reason: error,
        timestamp: Date.now(),
      });

      this.appendDeadLetterSync(item);
      console.error(`[QUEUE DLQ] Event ${id} exhausted max retries (${this.maxRetries}). Moved to Dead-Letter Queue: ${error}`);
    } else {
      item.status = 'PENDING';
      this.appendWalSync({
        op: 'FAILED',
        id,
        retryCount: item.retryCount,
        lastError: error,
        timestamp: Date.now(),
      });
    }

    if (this.walLineCount >= this.compactionThreshold) {
      this.compactWALSync();
    }
  }

  public getQueueLength(): number {
    return this.queue.size;
  }

  public getDeadLetterCount(): number {
    return this.deadLetters.size;
  }

  /**
   * P1: Chỉ trả về các item PENDING và KHÔNG nằm trong inFlightIds
   * Tuyệt đối không dispatch trùng lặp các event đang được gửi
   */
  public getAllPending(): QueuedEventRecord[] {
    return Array.from(this.queue.values()).filter(
      (q) => q.status === 'PENDING' && !this.inFlightIds.has(q.id)
    );
  }

  public replayDeadLetter(id: string): boolean {
    const item = this.deadLetters.get(id);
    if (!item) return false;

    this.deadLetters.delete(id);
    item.retryCount = 0;
    item.status = 'PENDING';
    item.lastError = undefined;

    this.appendWalSync({
      op: 'ENQUEUE',
      id: item.id,
      eventType: item.eventType,
      payload: item.payload,
      createdAt: Date.now(),
      retryCount: 0,
    });

    this.queue.set(item.id, item);
    return true;
  }

  public getAllDeadLetters(): QueuedEventRecord[] {
    return Array.from(this.deadLetters.values());
  }

  public clear(): void {
    this.queue.clear();
    this.deadLetters.clear();
    this.inFlightIds.clear();
    this.walLineCount = 0;
    try {
      if (fs.existsSync(this.walFile)) fs.unlinkSync(this.walFile);
      if (fs.existsSync(this.deadLetterFile)) fs.unlinkSync(this.deadLetterFile);
    } catch {}
  }
}
