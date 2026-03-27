import { createHash } from "crypto";

export async function hash(buffer: Buffer) {
  return createHash("sha1").update(buffer).digest("hex");
}
