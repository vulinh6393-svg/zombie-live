import { z } from 'zod';

export const LiveProviderSchema = z.enum(['mock', 'tiktok', 'replay']);
export type LiveProvider = z.infer<typeof LiveProviderSchema>;

export const LiveEventTypeSchema = z.enum(['comment', 'gift', 'like', 'follow']);
export type LiveEventType = z.infer<typeof LiveEventTypeSchema>;

export const NormalizedGiftPayloadSchema = z.object({
  giftId: z.string(),
  quantity: z.number().int().positive(),
  streakGroupId: z.string().optional(),
  cumulativeQuantity: z.number().int().positive().optional(),
  isFinal: z.boolean().default(true),
});
export type NormalizedGiftPayload = z.infer<typeof NormalizedGiftPayloadSchema>;

export const NormalizedLiveEventSchema = z.object({
  eventKey: z.string().min(1),
  provider: LiveProviderSchema,
  liveSessionId: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  at: z.string().datetime(),
  type: LiveEventTypeSchema,
  comment: z.string().optional(),
  gift: NormalizedGiftPayloadSchema.optional(),
  like: z.object({ delta: z.number().int().positive() }).optional(),
  rawRef: z.string().optional(),
});
export type NormalizedLiveEvent = z.infer<typeof NormalizedLiveEventSchema>;

/**
 * Schema bắt buộc cho mọi sự kiện tặng quà gửi vào Server Authoritative Engine (P0.3 Fix)
 */
export const AuthoritativeGiftEventSchema = z.object({
  provider: LiveProviderSchema.default('mock'),
  liveSessionId: z.string().min(1),
  providerEventId: z.string().min(1), // Unique event ID from live platform/bridge (Mandatory for idempotency)
  senderId: z.string().min(1),
  senderName: z.string().min(1),
  giftId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  streakId: z.string().optional(),
  streakStatus: z.enum(['IN_PROGRESS', 'FINISHED']).optional(),
  timestamp: z.number().int().positive(),
});
export type AuthoritativeGiftEvent = z.infer<typeof AuthoritativeGiftEventSchema>;

export interface IdempotencyStore {
  has(key: string): boolean;
  add(key: string): void;
  clear(): void;
}

/**
 * Normalizes command text by trimming, converting to uppercase,
 * and replacing common Vietnamese diacritics.
 */
export function normalizeCommand(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  return trimmed
    .replace(/[ÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶ]/g, 'A')
    .replace(/[ÉÈẺẼẸÊẾỀỂỄỆ]/g, 'E')
    .replace(/[ÍÌỈĨỊ]/g, 'I')
    .replace(/[ÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ]/g, 'O')
    .replace(/[ÚÙỦŨỤƯỨỪỬỮỰ]/g, 'U')
    .replace(/[ÝỲỶỸỴ]/g, 'Y')
    .replace(/Đ/g, 'D');
}
