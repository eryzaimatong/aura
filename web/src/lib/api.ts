import type { AuraCardRow, ColorSeason, FaceShape, ItemCategory, Seasonality, Undertone } from './database.types';
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
  // FormData sets its own multipart boundary.
  if (!(init?.body instanceof FormData)) headers.set('Content-Type', 'application/json');
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

type NotSure = 'not_sure';

/** "This doesn't look like me" — each field sent becomes a training label (hard rule 12). */
export interface CorrectionRequest {
  face_shape?: FaceShape | NotSure;
  season?: ColorSeason | NotSure;
  undertone?: Undertone | NotSure;
}

export function postCorrection(body: CorrectionRequest): Promise<AuraCard> {
  return request<AuraCard>('/api/cards/current/correction', { method: 'POST', auth: true, body: JSON.stringify(body) });
}

export interface TagResponse {
  model_version: string;
  cutout_webp_base64: string;
  cutout_ok: boolean;
  category: ItemCategory;
  category_conf: number;
  alternatives: { category: ItemCategory; confidence: number }[];
  subcategory: string;
  subcategory_label: string;
  colors: { hex: string; pct: number; name: string }[];
  color_name: string | null;
  lab_primary: [number, number, number] | null;
  in_palette: boolean | null;
  palette_reason: string | null;
  seasonality: Seasonality;
  suggested_name: string;
  embedding: number[];
}

/** Garment photo → cut-out + suggestions. Nothing is saved by this call. */
export function tagItem(photo: Blob): Promise<TagResponse> {
  const form = new FormData();
  form.append('image', photo, 'item.jpg');
  return request<TagResponse>('/api/items/tag', { method: 'POST', auth: true, body: form });
}

export function postUndertoneQuiz(answers: UndertoneAnswers): Promise<AuraCard> {
  return request<AuraCard>('/api/cards/current/undertone', { method: 'POST', auth: true, body: JSON.stringify(answers) });
}
