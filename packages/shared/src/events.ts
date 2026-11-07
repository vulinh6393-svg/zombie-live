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
