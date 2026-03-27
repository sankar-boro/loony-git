import { Hash } from "../types";

export declare class ObjectStore {
  public objectsPath: any;
  constructor();
  init(): Promise<void>;
  store(data: Buffer, type: string): Promise<Hash>;
  read(hash: Hash): Promise<{
    type: string;
    content: Buffer;
  }>;
  readObject(hash: Hash): Promise<{
    type: string;
    content: Buffer;
  }>;
}
