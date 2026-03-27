import { ConfigValues } from "../types";

export const serializeConfig = (config: ConfigValues): string => {
  const lines: string[] = [];

  for (const [section, values] of Object.entries(config)) {
    const entries = Object.entries(values);

    const hasSubsections = entries.some(
      ([, v]) => typeof v === "object" && v !== null,
    );

    if (hasSubsections) {
      for (const [subsection, subValues] of entries) {
        if (typeof subValues !== "object" || subValues === null) continue;

        lines.push(`[${section} "${subsection}"]`);

        for (const [key, value] of Object.entries(subValues)) {
          const formattedValue = formatValue(value);
          lines.push(`  ${key} = ${formattedValue}`);
        }

        lines.push("");
      }
    } else {
      lines.push(`[${section}]`);

      for (const [key, value] of entries) {
        const formattedValue = formatValue(value);
        lines.push(`  ${key} = ${formattedValue}`);
      }

      lines.push("");
    }
  }

  return lines.join("\n").trim();
};

const formatValue = (value: any): string => {
  if (typeof value === "string") {
    // Quote if contains spaces
    return value.includes(" ") ? `"${value}"` : value;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
};
