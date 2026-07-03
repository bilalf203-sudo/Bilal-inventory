import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Env } from '../../config/env.validation';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Stores article images on the local filesystem and serves them via Express
 * static middleware mounted at /uploads. Used when STORAGE_DRIVER=local
 * (typically local development without Supabase).
 */
@Injectable()
export class LocalStorageService {
  private readonly rootDir: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService<Env, true>) {
    this.rootDir = resolve(config.get('LOCAL_STORAGE_DIR', { infer: true }) ?? './uploads');
    this.baseUrl = config.get('LOCAL_STORAGE_BASE_URL', { infer: true }) ?? 'http://localhost:4000/uploads';
  }

  get root(): string {
    return this.rootDir;
  }

  async uploadArticleImage(
    articleId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ): Promise<string> {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported image type: ${file.mimetype}`);
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(`Image exceeds ${MAX_BYTES / 1024 / 1024}MB limit`);
    }

    const ext = extFromMime(file.mimetype);
    const relPath = `articles/${articleId}/${randomUUID()}.${ext}`;
    const absPath = join(this.rootDir, relPath);
    await mkdir(join(this.rootDir, 'articles', articleId), { recursive: true });
    await writeFile(absPath, file.buffer);
    return `${this.baseUrl}/${relPath}`;
  }

  async deleteByUrl(publicUrl: string): Promise<void> {
    if (!publicUrl.startsWith(this.baseUrl)) return;
    const relPath = publicUrl.slice(this.baseUrl.length + 1);
    try {
      await unlink(join(this.rootDir, relPath));
    } catch {
      // ignore
    }
  }
}

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}
