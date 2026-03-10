export type StorageType = 'local' | 'oss';

export interface PutObjectParams {
  key: string;
  content: Buffer;
  contentType: string;
}

export interface PutObjectResult {
  key: string;
  url: string;
  storageType: StorageType;
}

export interface StorageProvider {
  putObject(params: PutObjectParams): Promise<PutObjectResult>;
}
