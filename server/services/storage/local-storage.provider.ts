import path from 'path';
import fs from 'fs/promises';
import { ValidationError } from '../../utils/errors.js';
import { PutObjectParams, PutObjectResult, StorageProvider } from './storage.provider.js';

export class LocalStorageProvider implements StorageProvider {
  private readonly uploadRoot = path.join(process.cwd(), 'uploads');

  private resolveSafePath(key: string): string {
    const root = path.resolve(this.uploadRoot);
    const normalizedKey = key.replace(/\\/g, '/');
    const resolved = path.resolve(root, normalizedKey);

    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      throw new ValidationError('非法文件路径');
    }

    return resolved;
  }

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    const fullPath = this.resolveSafePath(params.key);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, params.content);

    return {
      key: params.key,
      url: `/uploads/${params.key}?t=${Date.now()}`,
      storageType: 'local',
    };
  }
}
