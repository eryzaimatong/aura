import type { AuraCardRow } from './database.types';
import type { ScanMeasurements } from './face/analyze';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    /** Machine-readable `detail` from FastAPI, e.g. "consent_required". */
    public readonly code: string,
  ) {
    super(`API ${status}: ${code}`);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (init?.auth) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new ApiError(401, 'not_signed_in');
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const detail = typeof body === 'object' && body !== null && 'detail' in body ? (body as { detail: unknown }).detail : null;
    throw new ApiError(res.status, typeof detail === 'string' ? detail : `http_${res.status}`);
  }
  return (await res.json()) as T;
}

export interface HealthResponse {
  status: 'ok';
  version: string;
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

/** The card as the API returns it (no user_id / is_current). */
export type AuraCard = Omit<AuraCardRow, 'user_id' | 'is_current'>;

export interface ScanResponse {
  scan_id: string;
  card: AuraCard;
  needs_quiz: boolean;
  color_conf: number;
}

/** Sends the derived numbers — never an image (hard rule 1). */
export function postScan(measurements: ScanMeasurements): Promise<ScanResponse> {
  return request<ScanResponse>('/api/scan', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ ...measurements, device_hint: 'browser' }),
  });
}

export interface UndertoneAnswers {
  veins: 'blue' | 'green' | 'unsure';
  metal: 'silver' | 'gold' | 'both';
  sun: 'burn' | 'tan' | 'burn_then_tan';
}

export function postUndertoneQuiz(answers: UndertoneAnswers): Promise<AuraCard> {
  return request<AuraCard>('/api/cards/current/undertone', { method: 'POST', auth: true, body: JSON.stringify(answers) });
}
