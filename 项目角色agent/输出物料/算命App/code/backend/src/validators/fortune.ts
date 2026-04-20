import { z } from 'zod';

const PillarSchema = z.object({
  stem: z.string().length(1),
  branch: z.string().length(1),
  element: z.string(),
});

const BaziDataSchema = z.object({
  yearPillar: PillarSchema,
  monthPillar: PillarSchema,
  dayPillar: PillarSchema,
  hourPillar: PillarSchema.nullable(),
  fiveElements: z.object({
    metal: z.number(),
    wood: z.number(),
    water: z.number(),
    fire: z.number(),
    earth: z.number(),
  }),
  summary: z.string(),
});

export const FortuneStartSchema = z.object({
  baziData: BaziDataSchema,
  gender: z.enum(['male', 'female']).nullable().optional(),
});

export const FortuneChatSchema = z.object({
  message: z.string().min(1).max(500),
  baziData: BaziDataSchema,
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).max(40), // 20 rounds = 40 messages max
  round: z.number().min(1).max(20),
});
