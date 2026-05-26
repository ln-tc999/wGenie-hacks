const formatter = (value: number, exp: number) => {
  const result = value * 10 ** exp;

  if (result > 100) {
    return result.toFixed(0);
  }

  if (result > 10) {
    return result.toFixed(1);
  }

  return result.toFixed(2);
};

const regularFormatter = (value: number) => {
  return formatter(value, 0);
};

const thousandFormatter = (value: number) => {
  return formatter(value, -3);
};

const millionFormatter = (value: number) => {
  return formatter(value, -6);
};

const billionFormatter = (value: number) => {
  return formatter(value, -9);
};

const trillionFormatter = (value: number) => {
  return formatter(value, -12);
};

export const formatNumberWithSuffix = (
  value: number,
  showSign = true,
): string => {
  if ([0, Infinity, -Infinity].includes(value)) {
    return '0';
  }

  if (isNaN(value)) {
    return '0';
  }

  const isNegative = value < 0;
  const prefix = showSign && isNegative ? '-' : '';
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000_000) {
    return `${prefix}${trillionFormatter(absValue)}T`;
  }

  if (absValue >= 1_000_000_000) {
    return `${prefix}${billionFormatter(absValue)}B`;
  }

  if (absValue >= 1_000_000) {
    return `${prefix}${millionFormatter(absValue)}M`;
  }

  if (absValue >= 1_000) {
    return `${prefix}${thousandFormatter(absValue)}K`;
  }

  return `${prefix}${regularFormatter(absValue)}`;
};
