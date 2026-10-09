import { z } from 'zod';

const ideas = z.array(z.string().max(2000)).max(30).default([]);
export const projectPlusPlanSchema = z.object({
  conceptSummary: z.string().min(1).max(4000),
  layoutIdeas: ideas,
  materialIdeas: ideas,
  decisionsToMake: ideas,
  questionsForTradesperson: ideas,
  practicalChecklist: ideas,
  budgetBuckets: z.array(z.object({ name: z.string().max(200), note: z.string().max(2000) })).max(20).default([]),
  safetyNote: z.string().max(2000).optional(),
});
