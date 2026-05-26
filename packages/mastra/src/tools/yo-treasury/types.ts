import { z } from 'zod';

/** Full pending action schema — passed from working memory to action tools */
export const existingActionSchema = z.object({
  id: z.string(),
  protocol: z.string(),
  actionType: z.string(),
  description: z.string(),
  fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
});
