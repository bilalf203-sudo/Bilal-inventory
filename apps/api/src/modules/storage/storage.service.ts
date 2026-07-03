import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Env } from '../../config/env.validation';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { LocalStorageService } from './local-storage.service';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Façade over Supabase Storage or LocalStorageService, picked from STORAGE_DRIVER.
 * Controllers depend on this — they shouldn't know which backend is active.
 */
@Injectable()
export class StorageService {
  private readonly driver: 'supabase' | 'local';

  constructor(
    config: ConfigService<Env, true>,
    private readonly supabase: SupabaseService,
    private readonly local: LocalStorageService,
  ) {
    this.driver = config.get('STORAGE_DRIVER', { infer: true }) ?? 'supabase';
  }

  async uploadArticleImage(
    articleId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ): Promise<string> {
    if (this.driver === 'local') {
      return this.local.uploadArticleImage(articleId, file);
    }

    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported image type: ${file.mimetype}`);
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(`Image exceeds ${MAX_BYTES / 1024 / 1024}MB limit`);
    }

    const ext = extFromMime(file.mimetype);
    const path = `articles/${articleId}/${randomUUID()}.${ext}`;
    return this.supabase.uploadImage(path, file.buffer, file.mimetype);
  }

  async deleteByUrl(publicUrl: string): Promise<void> {
    if (this.driver === 'local') {
      return this.local.deleteByUrl(publicUrl);
    }
    const marker = `/storage/v1/object/public/${this.supabase.bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const path = publicUrl.slice(idx + marker.length);
    await this.supabase.deleteImage(path);
  }
}

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}
