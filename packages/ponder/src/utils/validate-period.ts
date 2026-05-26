import { Period, periodSchema } from './periods';

interface Args {
  period: string;
}

type Result =
  | {
      type: 'success';
      period: Period;
    }
  | {
      type: 'error';
      message: string;
    };

export const validatePeriod = ({ period }: Args): Result => {
  try {
    return {
      type: 'success',
      period: periodSchema.parse(period),
    };
  } catch (error) {
    return {
      type: 'error',
      message: 'Invalid period',
    };
  }
};
