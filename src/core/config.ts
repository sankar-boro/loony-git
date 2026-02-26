import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

import { parseConfig, parseValue, serializeConfig } from "../utils/config";
import { localConfigPath, globalConfigPath } from "../paths";

export interface ConfigValues {
  user?: {
    name?: string;
    email?: string;
  };
  core?: {
    editor?: string;
    autocrlf?: boolean;
    excludesfile?: string;
    pager?: string;
  };
  color?: {
    ui?: boolean;
    status?: string;
    branch?: string;
  };
  alias?: Record<string, string>;
  [key: string]: any;
}

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
    await fs.writeFile(this.globalConfigPath, content);
  }

  async saveLocal(): Promise<void> {
    if (!this.localConfigPath) {
      throw new Error("Not in a loonygit repository");
    }
    const content = this.serializeConfig(this.localConfig);
    await fs.writeFile(this.localConfigPath, content);
  }

  private parseConfig(content: string): ConfigValues {
    return parseConfig(content);
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

  get(key: string): any {
    // Split key: user.name or core.editor
    const parts = key.split(".");

    // Try local config first (higher priority)
    let value = this.getFromConfig(this.localConfig, parts);
    if (value !== undefined) return value;

    // Then try global config
    value = this.getFromConfig(this.config, parts);
    if (value !== undefined) return value;

    return null;
  }

  private getFromConfig(config: ConfigValues, parts: string[]): any {
    let current: any = config;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  set(key: string, value: string, global: boolean = false): void {
    const parts = key.split("."); // e.g. user.name => ["user", "name"]
    const target = global ? this.config : this.localConfig;

    let current = target;

    // Navigate to the second-to-last part
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    // Set the final value
    const lastPart = parts[parts.length - 1];
    current[lastPart] = parseValue(value);
  }

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
  }

  list(global: boolean = false): ConfigValues {
    return global ? this.config : this.localConfig;
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
