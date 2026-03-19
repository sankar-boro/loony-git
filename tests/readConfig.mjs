// const fs = require("fs");
import fs from "fs/promises";

const parseValue = (value) => {
  // Try to parse as number
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

  // Parse booleans
  if (value === "true") return true;
  if (value === "false") return false;

  // Default to string
  return value;
};

const parseConfig = (content) => {
  const config = {};
  const lines = content.split("\n");
  let currentSection = null;

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

export const serializeConfig = (config) => {
  const lines = [];

  for (const [section, values] of Object.entries(config)) {
    // case: section has subsections (e.g. remote.origin)
    const hasSubsections = Object.values(values).some(
      (v) => typeof v === "object",
    );

    if (hasSubsections) {
      for (const [subsection, subValues] of Object.entries(values)) {
        lines.push(`[${section} "${subsection}"]`);

        for (const [key, value] of Object.entries(subValues)) {
          const formattedValue = formatValue(value);
          lines.push(`  ${key} = ${formattedValue}`);
        }

        lines.push("");
      }
    } else {
      // normal section
      lines.push(`[${section}]`);

      for (const [key, value] of Object.entries(values)) {
        const formattedValue = formatValue(value);
        lines.push(`  ${key} = ${formattedValue}`);
      }

      lines.push("");
    }
  }

  return lines.join("\n").trim();
};

export function serializeConfig1(config) {
  const lines = [];

  for (const [section, values] of Object.entries(config)) {
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "object" && !Array.isArray(value)) {
        // subsection
        lines.push(`[${section} "${key}"]`);

        for (const [k, v] of Object.entries(value)) {
          const values = ensureArray(v);

          for (const val of values) {
            lines.push(`\t${k} = ${formatValue(val)}`);
          }
        }

        lines.push("");
      } else {
        // normal section
        if (!lines.includes(`[${section}]`)) {
          lines.push(`[${section}]`);
        }

        const values = ensureArray(value);

        for (const val of values) {
          lines.push(`\t${key} = ${formatValue(val)}`);
        }
      }
    }

    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function parseConfig1(content) {
  const config = {};

  const lines = content.split(/\r?\n/);

  let currentSection = null;
  let currentSubsection = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || line.startsWith(";")) {
      continue;
    }

    const sectionMatch = line.match(/^\[([^\s"\]]+)(?:\s+"([^"]+)")?\]$/);

    if (sectionMatch) {
      currentSection = sectionMatch[1];
      currentSubsection = sectionMatch[2] ?? null;

      if (!config[currentSection]) {
        config[currentSection] = {};
      }

      if (currentSubsection) {
        if (!config[currentSection][currentSubsection]) {
          config[currentSection][currentSubsection] = {};
        }
      }

      continue;
    }

    const kvMatch = line.match(/^([A-Za-z0-9\.\-\_]+)\s*=\s*(.*)$/);

    if (!kvMatch || !currentSection) continue;

    const key = kvMatch[1];
    const value = parseValue(kvMatch[2]);

    let target = config[currentSection];

    if (currentSubsection) {
      target = config[currentSection][currentSubsection];
    }

    if (target[key] === undefined) {
      target[key] = value;
    } else if (Array.isArray(target[key])) {
      target[key].push(value);
    } else {
      target[key] = [target[key], value];
    }
  }

  return config;
}

const formatValue = (value) => {
  if (typeof value === "string") {
    // Quote if contains spaces
    return value.includes(" ") ? `"${value}"` : value;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
};

function ensureArray(v) {
  return Array.isArray(v) ? v : [v];
}

const config = {
  user: { name: "Sankar Boro", email: "sankar.boro@yahoo.com" },
  remote: {
    origin: {
      url: "https://loonygit.com/sankar-boro/hello.git",
    },
  },
};
async function main() {
  const data = await fs.readFile("./.loonygit/config", "utf8");
  const res = parseConfig(data);
  console.log(res);

  const res1 = serializeConfig1(config);
  console.log(res1);

  const res2 = parseConfig1(res1);
  console.log(res2);
}

main();
