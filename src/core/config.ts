import * as fs from "fs/promises";

import { deserializeConfig, serializeConfig, parseValue } from "../utils";
import { localConfigPath, globalConfigPath } from "../paths";
import type { ConfigValues } from "../types";

export class Config {
  private globalConfigPath: string;
  private localConfigPath: string;
  private config: ConfigValues = {};
  private localConfig: ConfigValues = {};

  constructor() {
    // Global config location (~/.loonygitconfig)
    this.globalConfigPath = globalConfigPath;
    this.localConfigPath = localConfigPath;
  }

  async loadAll(): Promise<void> {
    // Load global config first (lowest priority)
    await this.loadGlobal();

    // Then load local config (overrides global)
    if (this.localConfigPath) {
      await this.loadLocal();
    }
  }

  async loadGlobal(): Promise<void> {
    try {
      const content = await fs.readFile(this.globalConfigPath, "utf-8");
      this.config = this.parseConfig(content);
    } catch (error) {
      // Config doesn't exist, use defaults
      this.config = this.getDefaults();
    }
  }

  async loadLocal(): Promise<void> {
    try {
      const content = await fs.readFile(this.localConfigPath, "utf-8");
      this.localConfig = this.parseConfig(content);
    } catch (error) {
      // Local config doesn't exist yet
      this.localConfig = {};
    }
  }

  async saveGlobal(): Promise<void> {
    const content = this.serializeConfig(this.config);
    await fs.writeFile(this.globalConfigPath, content, "utf-8");
  }

  async saveLocal(): Promise<void> {
    if (!this.localConfigPath) {
      throw new Error("Not in a loonygit repository");
    }
    const content = this.serializeConfig(this.localConfig);
    await fs.writeFile(this.localConfigPath, content, "utf-8");
  }

  private parseConfig(content: string): ConfigValues {
    return deserializeConfig(content);
  }

  private serializeConfig(config: ConfigValues): string {
    return serializeConfig(config);
  }

  private getDefaults(): ConfigValues {
    return {
      core: {
        editor: process.env.EDITOR || "vi",
        autocrlf: process.platform === "win32",
        pager: "less",
      },
      color: {
        ui: true,
        status: "auto",
        branch: "auto",
      },
    };
  }

  /**
   * Get a single value (returns the last value if multiple exist)
   */
  get(key: string): any {
    // Split key: user.name or core.editor
    const parts = key.split(".");

    // Try local config first (higher priority)
    let value = this.getFromConfig(this.localConfig, parts);
    if (value !== undefined) {
      // If it's an array, return the last value (git behavior)
      return Array.isArray(value) ? value[value.length - 1] : value;
    }

    // Then try global config
    value = this.getFromConfig(this.config, parts);
    if (value !== undefined) {
      return Array.isArray(value) ? value[value.length - 1] : value;
    }

    return null;
  }

  /**
   * Get all values for a key (supports multi-valued keys)
   */
  getAll(key: string): any[] {
    const parts = key.split(".");

    // Try local config first
    let value = this.getFromConfig(this.localConfig, parts);
    let values: any[] = [];

    if (value !== undefined) {
      values = values.concat(Array.isArray(value) ? value : [value]);
    }

    // Then global config (git shows values from all config files)
    value = this.getFromConfig(this.config, parts);
    if (value !== undefined) {
      values = values.concat(Array.isArray(value) ? value : [value]);
    }

    return values;
  }

  /**
   * Get all keys matching a regex pattern
   */
  getRegexp(pattern: string): Record<string, string> {
    const regex = new RegExp(pattern);
    const result: Record<string, string> = {};

    // Helper to flatten config with dots
    const flatten = (obj: any, prefix: string = ""): Record<string, any> => {
      let flat: Record<string, any> = {};

      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === "object" && !Array.isArray(value)) {
          Object.assign(flat, flatten(value, fullKey));
        } else {
          flat[fullKey] = value;
        }
      }

      return flat;
    };

    // Flatten both configs
    const flatLocal = flatten(this.localConfig);
    const flatGlobal = flatten(this.config);

    // Combine and filter by regex
    const allKeys = new Set([
      ...Object.keys(flatLocal),
      ...Object.keys(flatGlobal),
    ]);

    for (const key of allKeys) {
      if (regex.test(key)) {
        // Get the last value (local overrides global)
        const value =
          flatLocal[key] !== undefined ? flatLocal[key] : flatGlobal[key];
        result[key] = Array.isArray(value) ? value[value.length - 1] : value;
      }
    }

    return result;
  }

  private getFromConfig(config: ConfigValues, parts: string[]): any {
    let current: any = config;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Set a value (replaces all existing values by default)
   */
  set(key: string, value: string, global: boolean = false): void {
    const parts = key.split(".");
    const target = global ? this.config : this.localConfig;

    let current = target;

    // Navigate to the second-to-last part
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }

    // Set the final value (replaces any existing)
    const lastPart = parts[parts.length - 1];
    current[lastPart] = parseValue(value);
  }

  /**
   * Add a value (appends to existing values)
   */
  add(key: string, value: string, global: boolean = false): void {
    const parts = key.split(".");
    const target = global ? this.config : this.localConfig;

    let current = target;

    // Navigate to the second-to-last part
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }

    // Add the value (append to array or convert to array)
    const lastPart = parts[parts.length - 1];
    const parsedValue = parseValue(value);

    if (current[lastPart] === undefined) {
      current[lastPart] = parsedValue;
    } else if (Array.isArray(current[lastPart])) {
      current[lastPart].push(parsedValue);
    } else {
      current[lastPart] = [current[lastPart], parsedValue];
    }
  }

  /**
   * Replace all values for a key (optionally matching a regex)
   */
  replaceAll(
    key: string,
    value: string,
    valueRegex?: string,
    global: boolean = false,
  ): void {
    const parts = key.split(".");
    const target = global ? this.config : this.localConfig;

    let current = target;

    // Navigate to the second-to-last part
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    const parsedValue = parseValue(value);

    if (valueRegex && Array.isArray(current[lastPart])) {
      // Only replace values matching the regex
      const regex = new RegExp(valueRegex);
      const newValues = current[lastPart].map((v: any) =>
        regex.test(String(v)) ? parsedValue : v,
      );
      current[lastPart] = newValues;
    } else {
      // Replace all
      current[lastPart] = parsedValue;
    }
  }

  /**
   * Unset a key completely
   */
  unset(key: string, global: boolean = false): void {
    const parts = key.split(".");
    const target = global ? this.config : this.localConfig;

    let current = target;

    // Navigate to the parent of the key to delete
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) return;
      current = current[part];
    }

    // Delete the key
    const lastPart = parts[parts.length - 1];
    delete current[lastPart];

    // Clean up empty objects
    this.cleanEmptyObjects(target);
  }

  /**
   * Unset a specific value from a multi-valued key
   */
  unsetValue(key: string, value: string, global: boolean = false): void {
    const parts = key.split(".");
    const target = global ? this.config : this.localConfig;

    let current = target;

    // Navigate to the parent of the key
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) return;
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    const parsedValue = parseValue(value);

    if (Array.isArray(current[lastPart])) {
      // Filter out the value
      current[lastPart] = current[lastPart].filter(
        (v: any) => v !== parsedValue,
      );

      // If only one value left, convert back to scalar
      if (current[lastPart].length === 1) {
        current[lastPart] = current[lastPart][0];
      } else if (current[lastPart].length === 0) {
        delete current[lastPart];
      }
    } else if (current[lastPart] === parsedValue) {
      delete current[lastPart];
    }

    // Clean up empty objects
    this.cleanEmptyObjects(target);
  }

  /**
   * Clean up empty objects in the config
   */
  private cleanEmptyObjects(obj: any): void {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        this.cleanEmptyObjects(value);
        if (Object.keys(value).length === 0) {
          delete obj[key];
        }
      }
    }
  }

  list(global: boolean = false): ConfigValues {
    return global ? this.config : this.localConfig;
  }

  /**
   * List all config including both global and local
   */
  listAll(): ConfigValues {
    // Deep merge local over global
    const merged = JSON.parse(JSON.stringify(this.config));
    this.deepMerge(merged, this.localConfig);
    return merged;
  }

  private deepMerge(target: any, source: any): void {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }

  async getUserInfo(): Promise<{ name: string; email: string }> {
    const name = this.get("user.name");
    const email = this.get("user.email");

    if (!name || !email) {
      throw new Error(
        "User name and email must be configured.\n" +
          'Run: loonygit config --global user.name "Your Name"\n' +
          '     loonygit config --global user.email "your@email.com"',
      );
    }

    return { name, email };
  }
}
