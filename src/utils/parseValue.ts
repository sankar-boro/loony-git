export const parseValue = (value: string) => {
  // Try to parse as number
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

  // Parse booleans
  if (value === "true") return true;
  if (value === "false") return false;

  // Default to string
  return value;
};
