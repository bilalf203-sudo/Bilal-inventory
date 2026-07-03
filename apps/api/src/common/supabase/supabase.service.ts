import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import type { Env } from '../../config/env.validation';

export interface SupabaseJwtPayload extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
}

/**
 * Lazily constructs the Supabase admin client. In dev mode (AUTH_DRIVER=dev,
 * STORAGE_DRIVER=local), Supabase env vars may be absent — callers must not
 * touch `.admin` / `.verifyJwt` / `.uploadImage` in that mode.
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private _adminClient: SupabaseClient | null = null;
  private _jwtSecret: Uint8Array | null = null;
  private _jwks: JWTVerifyGetKey | null = null;
  public readonly bucket: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.bucket = this.config.get('SUPABASE_STORAGE_BUCKET', { infer: true }) ?? 'article-images';
  }

  get admin(): SupabaseClient {
    if (!this._adminClient) {
      const url = this.config.get('SUPABASE_URL', { infer: true });
      const serviceRoleKey = this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
      if (!url || !serviceRoleKey) {
        throw new Error('Supabase admin client requested but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
      }
      this._adminClient = createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return this._adminClient;
  }

  private getJwtSecret(): Uint8Array | null {
    if (this._jwtSecret) return this._jwtSecret;
    const secret = this.config.get('SUPABASE_JWT_SECRET', { infer: true });
    if (!secret) return null;
    this._jwtSecret = new TextEncoder().encode(secret);
    return this._jwtSecret;
  }

  private getJwks(): JWTVerifyGetKey {
    if (this._jwks) return this._jwks;
    const url = this.config.get('SUPABASE_URL', { infer: true });
    if (!url) throw new Error('SUPABASE_URL not configured');
    this._jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
    return this._jwks;
  }

  /**
   * Verifies a Supabase user JWT. New projects sign session tokens with
   * asymmetric keys (ES256/RS256), verified against the project's JWKS; older
   * projects use a shared HS256 secret, kept here as a fallback.
   */
  async verifyJwt(token: string): Promise<SupabaseJwtPayload> {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, this.getJwks()));
    } catch (asymmetricError) {
      const secret = this.getJwtSecret();
      if (!secret) throw asymmetricError;
      ({ payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] }));
    }
    if (!payload.sub) throw new Error('JWT missing sub claim');
    return payload as SupabaseJwtPayload;
  }

  async uploadImage(path: string, file: Buffer, contentType: string): Promise<string> {
    const { error } = await this.admin.storage
      .from(this.bucket)
      .upload(path, file, { contentType, upsert: true });
    if (error) {
      this.logger.error(`Storage upload failed for ${path}: ${error.message}`);
      throw error;
    }
    const { data } = this.admin.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteImage(path: string): Promise<void> {
    const { error } = await this.admin.storage.from(this.bucket).remove([path]);
    if (error) this.logger.warn(`Storage delete failed for ${path}: ${error.message}`);
  }
}
