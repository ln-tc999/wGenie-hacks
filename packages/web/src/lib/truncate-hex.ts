/**
 * Truncates a hex string (like an Ethereum address) to show only the first and last few characters
 * @param address - The hex string to truncate (must start with '0x')
 * @param visibleDigits - Number of characters to show from the beginning and end (default: 4)
 * @returns The truncated hex string in format '0x1234...5678'
 */
export const truncateHex = (address: string, visibleDigits = 4): string => {
  // Validate input
  if (!address || typeof address !== 'string') {
    throw new Error('Address must be a non-empty string');
  }

  if (!address.startsWith('0x')) {
    throw new Error('Address must start with "0x"');
  }

  if (visibleDigits < 1) {
    throw new Error('Visible digits must be at least 1');
  }

  // Remove '0x' prefix for processing
  const hexPart = address.slice(2);

  // If the hex part is shorter than twice the visible digits, return the original
  if (hexPart.length <= visibleDigits * 2) {
    return address;
  }

  // Get the first and last visibleDigits characters
  const start = hexPart.slice(0, visibleDigits);
  const end = hexPart.slice(-visibleDigits);

  return `0x${start}...${end}`;
};
