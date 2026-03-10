import fs from 'fs/promises';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { LocalStorageProvider } from '../../server/services/storage/local-storage.provider.js';

describe('LocalStorageProvider', () => {
  it('writes object to uploads directory and returns relative url', async () => {
    const provider = new LocalStorageProvider();
    const key = `tests/local-provider-${Date.now()}.txt`;
    const content = Buffer.from('hello-local-storage');

    const result = await provider.putObject({
      key,
      content,
      contentType: 'text/plain',
    });

    const fullPath = path.join(process.cwd(), 'uploads', key);
    const fileData = await fs.readFile(fullPath, 'utf8');

    expect(fileData).toBe('hello-local-storage');
    expect(result.key).toBe(key);
    expect(result.storageType).toBe('local');
    expect(result.url.startsWith(`/uploads/${key}?t=`)).toBe(true);

    await fs.unlink(fullPath);
  });
});
