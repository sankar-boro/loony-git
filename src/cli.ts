#!/usr/bin/env node

require("dotenv").config();

import { program } from "commander";
import * as path from "path";
import { initCommand } from "./commands/init";
import { addCommand } from "./commands/add";
import { commitCommand } from "./commands/commit";
import { logCommand } from "./commands/log";
import { checkoutCommand } from "./commands/checkout";
import { branchCommand } from "./commands/branch";
import { statusCommand } from "./commands/status";
import { diffCommand } from "./commands/diff";
import { configCommand } from "./commands/config";
import { remoteCommand } from "./commands/remote";
import { pushCommand } from "./commands/push";
import { Config } from "./core";

const repoPath = path.resolve(process.cwd());

program
  .name("loonygit")
  .description("A Git-like version control system")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize a new repository")
  .argument("[path]", "directory to initialize", ".")
  .action(async (initPath: string) => {
    try {
      await initCommand(initPath);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("add")
  .description("Add file contents to the index")
  .argument("<files...>", "files to add")
  .action(async (files: string[]) => {
    try {
      await addCommand(repoPath, files);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("commit")
  .description("Record changes to the repository")
  .option("-m, --message <message>", "commit message")
  .option("--author <author>", 'author in format "Name <email>"')
  .action(async (options: { message: string; author?: string }) => {
    try {
      if (!options.message) {
        // Check if editor is configured
        const config = new Config();
        await config.loadAll();
        const editor = config.get("core.editor") || "vi";

        // In a real implementation, we'd open the editor here
        console.log("Please provide a commit message with -m");
        process.exit(1);
      }

      let authorInfo;
      if (options.author) {
        const match = options.author.match(/(.+) <(.+)>/);
        if (match) {
          authorInfo = { name: match[1], email: match[2] };
        }
      }

      await commitCommand(repoPath, options.message, authorInfo);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("log")
  .description("Show commit logs")
  .option("--oneline", "compress output to one line per commit")
  .option("-n, --max-count <n>", "limit number of commits")
  .action(async (options: any) => {
    try {
      await logCommand(repoPath);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("checkout")
  .description("Switch branches or restore working tree files")
  .argument("<target>", "branch or commit to checkout")
  .action(async (target: string) => {
    try {
      await checkoutCommand(repoPath, target);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("branch")
  .description("List, create, or delete branches")
  .argument("[branch-name]", "name of the branch")
  .option("-d, --delete", "delete branch")
  .option("-l, --list", "list branches")
  .action(
    async (
      branchName: string,
      options: { delete?: boolean; list?: boolean },
    ) => {
      try {
        await branchCommand(repoPath, branchName, options);
      } catch (error: any) {
        console.error("Error:", error.message);
        process.exit(1);
      }
    },
  );

program
  .command("status")
  .description("Show the working tree status")
  .option("-s, --short", "short format")
  .option("-b, --branch", "show branch info")
  .action(async (options) => {
    try {
      await statusCommand();
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("diff")
  .description("Show changes between commits, commit and working tree, etc")
  .argument("[commit1]", "first commit")
  .argument("[commit2]", "second commit")
  .option("--cached", "show diff between index and last commit")
  .option("--staged", "same as --cached")
  .action(async (commit1?: string, commit2?: string, options?: any) => {
    try {
      await diffCommand(repoPath, commit1, commit2);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("config")
  .description("Get and set repository or global options")
  .argument("[name]", "config key")
  .argument("[value]", "config value")
  .option("--global", "use global config file")
  .option("--local", "use local config file")
  .option("--list", "list all config entries")
  .option("--unset", "remove a config entry")
  .option("--add", "add a new value to a multi-valued entry")
  .option("--replace-all", "replace all matching entries")
  .action(async (name?: string, value?: string, options?: any) => {
    try {
      const args = [];
      if (name) args.push(name);
      if (value) args.push(value);

      await configCommand(args, {
        global: options?.global,
        local: options?.local,
        list: options?.list,
        unset: options?.unset,
        add: options?.add,
        replaceAll: options?.replaceAll,
      });
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("remote")
  .description("Manage set of tracked repositories")
  .argument("[action]", "remote action (add, remove, set-url, show)")
  .argument("[name]", "remote name")
  .argument("[url]", "remote url")
  .option("-v, --verbose", "show remote URLs")
  .action(
    async (action?: string, name?: string, url?: string, options?: any) => {
      try {
        const args: string[] = [];

        if (action) args.push(action);
        if (name) args.push(name);
        if (url) args.push(url);

        await remoteCommand(args, {
          verbose: options?.verbose,
        });
      } catch (error: any) {
        console.error("Error:", error.message);
        process.exit(1);
      }
    },
  );

program
  .command("push")
  .description("Push commits to a remote repository")
  .argument("[remote]", "remote name (default: origin)")
  .argument("[branch]", "branch name (default: current branch)")
  .action(async (remote?: string, branch?: string) => {
    try {
      const repoPath = process.cwd();

      await pushCommand(repoPath, remote ?? "origin", branch ?? "main");
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
