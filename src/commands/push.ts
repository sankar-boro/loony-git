import fetch from "node-fetch";

import { ObjectStore } from "../core";
import { Config } from "../core/config";
import { getLocalCommit } from "../paths";
import { getRepoName, collectObjects } from "../utils/index";
import { parseGitUrl } from "../utils/config";

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
  const { username, repo } = parseGitUrl(remoteUrl as string);

  const payload = {
    branch,
    head: localCommit,
    objects,
    email,
    repo: repo,
  };

  const response = await fetch(`${API_URL}/${username}/${repo}/push`, {
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
