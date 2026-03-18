import { ConfigValues } from "../core/config";

export const parseConfig = (content: string): ConfigValues => {
  const config: ConfigValues = {};
  const lines = content.split("\n");
  let currentSection: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith(";") || trimmed.startsWith("#") || trimmed === "") {
      continue;
    }

    // Section header: [section] or [section "subsection"]
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Key-value pair: key = value
    if (currentSection && trimmed.includes("=")) {
      const equalsIndex = trimmed.indexOf("=");
      const key = trimmed.substring(0, equalsIndex).trim();
      let value = trimmed.substring(equalsIndex + 1).trim();

      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }

      // Handle boolean values
      if (value.toLowerCase() === "true") value = "true";
      if (value.toLowerCase() === "false") value = "false";

      // Parse section.subsection.key format
      const sectionParts = currentSection.split(" ");
      const section = sectionParts[0];
      const subsection = sectionParts[1]?.replace(/^"|"$/g, "");

      if (subsection) {
        if (!config[section]) config[section] = {};
        if (!config[section][subsection]) config[section][subsection] = {};
        config[section][subsection][key] = parseValue(value);
      } else {
        if (!config[section]) config[section] = {};
        config[section][key] = parseValue(value);
      }
    }
  }

  return config;
};

export const parseValue = (value: string): any => {
  // Try to parse as number
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

  // Parse booleans
  if (value === "true") return true;
  if (value === "false") return false;

  // Default to string
  return value;
};

// export const serializeConfig = (config: ConfigValues): string => {
//   const lines: string[] = [];

//   for (const [section, values] of Object.entries(config)) {
//     if (typeof values === "object") {
//       lines.push(`[${section}]`);

//       for (const [key, value] of Object.entries(values)) {
//         if (typeof value === "object") {
//           // Handle subsections
//           for (const [subKey, subValue] of Object.entries(
//             value as Record<string, any>,
//           )) {
//             const formattedValue = formatValue(subValue);
//             lines.push(`  ${subKey} = ${formattedValue}`);
//           }
//         } else {
//           const formattedValue = formatValue(value);
//           lines.push(`  ${key} = ${formattedValue}`);
//         }
//       }
//       lines.push("");
//     }
//   }

//   return lines.join("\n");
// };

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
