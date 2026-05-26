import { hexSchema } from '../utils/schema';
import { z } from 'zod';

const prehookSchema = z.object({
  selector: hexSchema,
  implementation: hexSchema,
  substrates: z.array(hexSchema).readonly(),
});

export type Prehook = z.infer<typeof prehookSchema>;
