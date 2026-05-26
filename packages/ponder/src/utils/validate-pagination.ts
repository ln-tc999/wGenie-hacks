import { z } from 'zod';

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(1000).default(20),
});

interface Args {
  page?: string;
  limit?: string;
}

type Result =
  | {
      type: 'success';
      page: number;
      limit: number;
      offset: number;
    }
  | {
      type: 'error';
      message: string;
    };

export const validatePagination = ({ page, limit }: Args): Result => {
  try {
    const parsed = paginationSchema.parse({
      page: page ? z.coerce.number().parse(page) : undefined,
      limit: limit ? z.coerce.number().parse(limit) : undefined,
    });

    return {
      type: 'success',
      page: parsed.page,
      limit: parsed.limit,
      offset: (parsed.page - 1) * parsed.limit,
    };
  } catch (error) {
    return {
      type: 'error',
      message:
        'Invalid pagination parameters. Page must be >= 1, limit must be 1-1000',
    };
  }
};
