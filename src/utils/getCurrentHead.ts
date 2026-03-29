import * as path from "path";
import * as fs from "fs/promises";
import { HEAD, LOONY_GIT_PATH } from "../paths";

export async function getCurrentHead(): Promise<string | null> {
  try {
    const headRef = (await fs.readFile(HEAD, "utf-8")).trim();
    if (headRef.startsWith("ref: ")) {
      const refPath = path.join(LOONY_GIT_PATH, headRef.slice(5));
      return (await fs.readFile(refPath, "utf-8")).trim();
    } else if (headRef.match(/^[a-f0-9]{40}$/)) {
      return headRef;
    }
    return null;
  } catch (error) {
    return null;
  }
}
