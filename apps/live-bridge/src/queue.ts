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
 * P0.1 & P0.2 (Final Acceptance Patch): Truly Durable Write-Ahead Log (WAL) Queue cho Live Bridge
 * - Ghi đĩa tức thời (zero debounce window) với fsyncSync trước khi xác nhận enqueue thành công.
 * - Append-only WAL log line-by-line; phục hồi 100% sau crash hoặc restart bất ngờ.
 * - Fail-closed: Giữ nguyên file hỏng làm tài liệu điều tra (.bak), cách ly middle corruption,
 *   tái dựng valid prefix, tuyệt đối không reset queue về [].
 * - Single-flight isolation: getAllPending() chỉ trả về PENDING (loại trừ IN_FLIGHT), ngăn chặn dispatch trùng lặp đồng thời.
 * - Durable DLQ Settlement: Ghi đĩa DLQ và fsyncSync TRƯỚC KHI xóa khỏi queue và TRƯỚC KHI ghi WAL DLQ.
 *   Lỗi lưu trữ (storage error) là fail-closed (throw, không nuốt lỗi, giữ lại event trong queue).
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

  /**
   * P0.2: Fail-closed DLQ persistence.
   * Tuyệt đối không nuốt lỗi ghi file. Nếu thất bại (disk full, read-only), ném ngoại lệ ngay.
   */
  private appendDeadLetterSync(item: QueuedEventRecord): void {
    this.ensureDirs();
    const line = JSON.stringify(item) + '\n';
    const fd = fs.openSync(this.deadLetterFile, 'a');
    try {
      fs.writeSync(fd, line, null, 'utf-8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * Tái tạo lại WAL với danh sách operations đã kiểm chứng hợp lệ
   */
  private rewriteWalSync(operations: WalOperation[]): void {
    this.ensureDirs();
    const tempFile = `${this.walFile}.recover_${Date.now()}`;
    const fd = fs.openSync(tempFile, 'w');
    try {
      for (const op of operations) {
        fs.writeSync(fd, JSON.stringify(op) + '\n', null, 'utf-8');
      }
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tempFile, this.walFile);
    this.walLineCount = operations.length;
  }

  /**
   * P1.1: Quản lý phục hồi và phát hiện corruption có kiểm chứng:
   * - Phân biệt: Partial trailing line (crash khi append dòng cuối) vs Middle corrupted line (hỏng ở giữa file).
   * - Bảo lưu file gốc (.bak) làm chứng cứ pháp chứng.
   * - Cắt gọt và khôi phục valid prefix lên đĩa; không âm thầm bỏ qua dòng giữa rồi tiếp tục append vào file lỗi.
   */
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
    let corruptionIndex = -1;
    const validOps: WalOperation[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        const op = JSON.parse(line) as WalOperation;
        if (!op || typeof op.op !== 'string' || !op.id) {
          throw new Error('Invalid WAL operation payload structure');
        }
        validOps.push(op);
      } catch (parseErr: any) {
        hasCorruptedLine = true;
        corruptionIndex = i;
        console.warn(`[QUEUE CORRUPTION DETECTED] Line ${i + 1} of ${lines.length} in WAL is corrupted: ${parseErr.message}`);
        break; // Dừng ngay tại ranh giới lỗi đầu tiên; không đọc tiếp các dòng sau ranh giới hỏng
      }
    }

    // Fail-Closed Recovery:
    if (hasCorruptedLine) {
      const corruptBak = `${this.walFile}.corrupt_${Date.now()}.bak`;
      try {
        fs.copyFileSync(this.walFile, corruptBak);
        console.warn(`[FORENSIC ARCHIVE] Corrupted WAL preserved at ${corruptBak}.`);
      } catch (bakErr: any) {
        console.error(`[FORENSIC ARCHIVE ERROR] Failed to copy corrupted WAL to .bak: ${bakErr.message}`);
      }

      const isPartialFinalLine = corruptionIndex === lines.length - 1;
      if (isPartialFinalLine) {
        console.info(`[WAL RECOVERY] Partial trailing line detected at end of file (index ${corruptionIndex}). Recovering valid prefix (${validOps.length} records).`);
      } else {
        console.warn(`[WAL RECOVERY] Middle WAL corruption detected at line ${corruptionIndex + 1}/${lines.length}. Quarantining corrupt remainder and recovering valid prefix (${validOps.length} records).`);
      }

      // Viết lại WAL chỉ chứa valid prefix để các append sau không nối tiếp vào dữ liệu hỏng
      this.rewriteWalSync(validOps);
    }

    // Áp dụng các operation hợp lệ vào queue
    for (const op of validOps) {
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
    }

    // Tải DLQ entries từ file DLQ
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

    // Crash recovery: Bất kỳ item nào dở dang trong RAM đều reset PENDING
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

  public enqueue(event: { id: string; eventType: 'COMMENT' | 'GIFT'; payload: any }): boolean {
    if (this.queue.has(event.id)) {
      return true; // Idempotent: đã tồn tại
    }

    if (this.queue.size >= this.maxQueueSize) {
      console.warn(`[QUEUE WARNING] Durable queue reached max size ${this.maxQueueSize}. Dropping event with backpressure.`);
      return false;
    }

    const item: QueuedEventRecord = {
      id: event.id,
      eventType: event.eventType,
      payload: event.payload,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    };

    // Ghi WAL và fsyncSync ngay lập tức trước khi cập nhật bộ nhớ
    this.appendWalSync({
      op: 'ENQUEUE',
      id: item.id,
      eventType: item.eventType,
      payload: item.payload,
      createdAt: item.createdAt,
      retryCount: 0,
    });

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

  /**
   * P0.2: Chuyển một sự kiện sang Dead-Letter Queue một cách an toàn và bền vững (Atomic settlement).
   * 1. Ghi vào tệp bridge_dead_letter.jsonl và fsyncSync trước.
   * 2. Ghi op DLQ vào WAL và fsyncSync.
   * 3. CHỈ XÓA khỏi hàng đợi chính khi cả hai bước lưu đĩa thành công.
   * Nếu có lỗi ghi đĩa, ném ngoại lệ và GIỮ NGUYÊN trong hàng đợi chính để retry/quản trị can thiệp.
   */
  public moveToDeadLetter(id: string, reason: string): void {
    const item = this.queue.get(id);
    if (!item) return;

    this.inFlightIds.delete(id);
    item.status = 'DEAD_LETTER';
    item.lastError = reason;
    item.lastAttemptAt = Date.now();

    try {
      // BƯỚC 1: Ghi DLQ file bền vững
      this.appendDeadLetterSync(item);

      // BƯỚC 2: Ghi WAL terminal state
      this.appendWalSync({
        op: 'DLQ',
        id,
        reason,
        timestamp: Date.now(),
      });

      // BƯỚC 3: Xóa khỏi active queue
      this.deadLetters.set(id, item);
      this.queue.delete(id);
      console.error(`[QUEUE DLQ] Event ${id} moved to Dead-Letter Queue: ${reason}`);
    } catch (err: any) {
      // FAIL-CLOSED: Không xóa khỏi queue chính nếu ghi đĩa thất bại
      item.status = 'PENDING';
      item.lastError = `STORAGE_DLQ_FAILED: ${err.message}`;
      console.error(`[QUEUE DLQ FAIL-CLOSED] Failed to persist DLQ record for ${id}. Retaining in queue: ${err.message}`);
      throw new Error(`DLQ_STORAGE_ERROR: Failed to persist dead-letter record for ${id}: ${err.message}`);
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
      this.moveToDeadLetter(id, error);
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
