import { z } from 'zod';
import type { CompletedJson } from '@/types/completedJson';

const addedQuestionSetSchema = z.object({
  uuid: z.string().uuid(),
  questionSetHeaderId: z.number().optional(),
  origin: z.enum(['manual', 'meta']).optional(),
  insertAt: z.object({
    pageId: z.string().optional(),
    panelName: z.string().optional(),
    index: z.number().optional(),
  }).optional(),
  answers: z.record(z.any()).optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional(),
});

const metaChoiceSchema = z.object({
  metaQuestionHeaderId: z.union([z.string(), z.number()]),
  selectedAnswerId: z.union([z.string(), z.number()]),
  insertedQuestionSetUUIDs: z.array(z.string().uuid()),
});

const completedJsonV1Schema = z.object({
  version: z.literal(1),
  snapshot: z.record(z.any()),
  additions: z.array(addedQuestionSetSchema).optional(),
  metaChoices: z.array(metaChoiceSchema).optional(),
  answers: z.record(z.any()).optional(),
  actions: z.array(z.record(z.any())).optional(),
  audit: z.array(z.record(z.any())).optional(),
}).passthrough();

export function validateCompletedJson(obj: unknown): { valid: true; value: CompletedJson } | { valid: false; errors: string[] } {
  const result = completedJsonV1Schema.safeParse(obj);
  if (result.success) return { valid: true, value: result.data as CompletedJson };
  const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return { valid: false, errors };
}

export default validateCompletedJson;
