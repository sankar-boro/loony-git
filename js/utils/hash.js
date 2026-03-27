import { createHash } from "crypto";

export async function hash(buffer) {
  return createHash("sha1").update(buffer).digest("hex");
}
