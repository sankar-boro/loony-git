import { TreeEntry } from "../types/index";

export function parseTree(
  buffer: Buffer,
  skipMetadata: boolean = false,
): TreeEntry[] {
  // Note
  // buffer.indexOf(0x00) + 1 => "<mode> <length>\0"

  const entries: TreeEntry[] = [];
  let i = skipMetadata ? buffer.indexOf(0x00) + 1 : 0;

  while (i < buffer.length) {
    // read mode
    let mode: any = "";
    while (buffer[i] !== 0x20) {
      // space
      mode += String.fromCharCode(buffer[i]);
      i++;
    }
    i++; // skip space

    // read filename
    let name = "";
    while (buffer[i] !== 0x00) {
      name += String.fromCharCode(buffer[i]);
      i++;
    }
    i++; // skip null byte

    // read 20 byte hash
    const hashBuffer = buffer.slice(i, i + 20);
    const hash = hashBuffer.toString("hex");
    i += 20;

    entries.push({
      mode,
      name,
      hash,
    });
  }

  return entries;
}
