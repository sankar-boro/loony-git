import * as path from "path";
import * as fs from "fs/promises";
import fetch from "node-fetch";

import { ObjectStore } from "../core";
import { Config } from "../core/config";
import { getHeadRef, getRefPath, getLocalCommit } from "../paths";
import { getRepoName, collectObjects } from "../utils/index";

const API_URL = process.env.API_URL;

export async function pushCommand(
  repoPath: string,
  remoteName: string = "origin",
  branch: string = "main",
): Promise<void> {
  const config = new Config();
  const objectStore = new ObjectStore();

  await config.loadAll();

  const allConfig = await config.listAll();
  const remoteUrl = config.get("remote.origin.url");
  const localCommit = await getLocalCommit();

  console.log(`Pushing ${branch} to ${remoteName} (${remoteUrl})`);

  const objects = await collectObjects(objectStore, localCommit);
  const email = allConfig.user?.email;
  const repoName = getRepoName(remoteUrl as string);

  const payload = {
    branch,
    head: localCommit,
    objects,
    email,
    repo: repoName,
  };

  const response = await fetch(API_URL + "/" + repoName + "/" + "push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`Push failed: ${response.statusText}`);
    process.exit(1);
  }

  console.log(`Push successful.`);
}
