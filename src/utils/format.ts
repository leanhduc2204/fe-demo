/**
 * Format numbers: round to 4 decimals, remove trailing zeros
 */
export const formatNumber = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return value.toString();

  // Round to 4 decimal places
  const rounded = Math.round(num * 10000) / 10000;

  // Convert to string with 4 decimal places
  const formatted = rounded.toFixed(4);

  // Remove trailing zeros
  return parseFloat(formatted).toString();
};
