import type { Job, TraderProfile } from '@/types';

// Production and staging no longer ship fabricated marketplace records.
// Keep these exports empty so older imports fail safe while the remaining
// preview-only wiring is retired without reintroducing fake users or jobs.
export const demoTraders: TraderProfile[] = [];
export const demoJobs: Job[] = [];
