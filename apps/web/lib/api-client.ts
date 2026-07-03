'use client';

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getSupabaseBrowser } from './supabase';
import { getCurrentBrandId } from '@/stores';

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  issues?: Array<{ path: string; code: string; message: string }>;
}

const baseURL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1`;
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

let _client: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (_client) return _client;
  const client = axios.create({ baseURL, timeout: 30_000 });

  client.interceptors.request.use(async (cfg: InternalAxiosRequestConfig) => {
    if (!BYPASS_AUTH) {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        cfg.headers.set('Authorization', `Bearer ${data.session.access_token}`);
      }
    }
    const brandId = getCurrentBrandId();
    if (brandId) {
      cfg.headers.set('X-Brand-Id', brandId);
    }
    return cfg;
  });

  client.interceptors.response.use(
    (res) => res,
    (err: AxiosError<ApiError>) => {
      const data = err.response?.data;
      const message = data?.message ?? err.message;
      const enriched = new Error(message) as Error & { apiError?: ApiError };
      if (data) enriched.apiError = data;
      return Promise.reject(enriched);
    },
  );

  _client = client;
  return client;
}

/**
 * Unwraps the { data } envelope produced by the API's TransformInterceptor.
 */
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await getApiClient().get<{ data: T }>(url, { params });
  return res.data.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await getApiClient().post<{ data: T }>(url, body, config);
  return res.data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await getApiClient().patch<{ data: T }>(url, body);
  return res.data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await getApiClient().delete<{ data: T }>(url);
  return res.data.data;
}

export async function apiUpload<T>(url: string, file: File, fieldName = 'file'): Promise<T> {
  const form = new FormData();
  form.append(fieldName, file);
  const res = await getApiClient().post<{ data: T }>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
