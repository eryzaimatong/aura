import type { AuraCardRow, ColorSeason, FaceShape, ItemCategory, Seasonality, Undertone } from './database.types';
import type { ScanMeasurements } from './face/analyze';
import { deviceHint } from './native';
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

export async function request<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
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
    body: JSON.stringify({ ...measurements, device_hint: deviceHint() }),
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
  /** Pieces already in the closet that look like this one. A nudge, never a block. */
  similar: { id: string; name: string; similarity: number }[];
}

/** Garment photo → cut-out + suggestions. Nothing is saved by this call. */
export function tagItem(photo: Blob): Promise<TagResponse> {
  const form = new FormData();
  form.append('image', photo, 'item.jpg');
  return request<TagResponse>('/api/items/tag', { method: 'POST', auth: true, body: form });
}

export type Occasion = 'casual' | 'class' | 'work' | 'date' | 'formal' | 'travel';

export interface WeatherNow {
  place: string | null;
  temp_c: number;
  feels_c: number;
  humidity: number;
  rain_pct: number;
  rain_from_hour: number | null;
  summary: string;
}

export function getWeather(coords: { lat: number; lon: number } | null): Promise<WeatherNow> {
  const q = coords ? `?lat=${coords.lat}&lon=${coords.lon}` : '';
  return request<WeatherNow>(`/api/weather${q}`, { auth: true });
}

export interface GeneratedOutfit {
  pieces: { id: string; slot: ItemCategory }[];
  /** Hard rule 7: always present — the UI never shows an outfit without it. */
  reason: string;
  tags: string[];
  note: string | null;
  occasion: Occasion | null;
  generator_v: string;
}

export interface OutfitRequest {
  occasion: Occasion | null;
  weather: Pick<WeatherNow, 'temp_c' | 'feels_c' | 'rain_pct'> | null;
  seed: number;
  avoid_ids: string[];
  /** "Style this piece": the outfit is built around this item. */
  require_id?: string | null;
}

export function generateOutfit(body: OutfitRequest): Promise<GeneratedOutfit> {
  return request<GeneratedOutfit>('/api/outfits/generate', { method: 'POST', auth: true, body: JSON.stringify(body) });
}

export type SaveRequest = Omit<WearRequest, 'worn_on'>;

/** Keeps a look in Saved looks without logging a wear. */
export function saveOutfit(body: SaveRequest): Promise<{ outfit_id: string }> {
  return request('/api/outfits/save', { method: 'POST', auth: true, body: JSON.stringify(body) });
}

export interface WearRequest {
  item_ids: string[];
  occasion: Occasion | null;
  weather: OutfitRequest['weather'];
  reason: string;
  generator_v: string;
  worn_on: string;
}

export function wearOutfit(body: WearRequest): Promise<{ outfit_id: string; newly_logged: number }> {
  return request('/api/outfits/wear', { method: 'POST', auth: true, body: JSON.stringify(body) });
}

export function postUndertoneQuiz(answers: UndertoneAnswers): Promise<AuraCard> {
  return request<AuraCard>('/api/cards/current/undertone', { method: 'POST', auth: true, body: JSON.stringify(answers) });
}

export type TripOccasion = 'casual' | 'work' | 'date' | 'formal' | 'travel';

export interface TripDay {
  date: string;
  min_c: number;
  max_c: number;
  rain_pct: number;
}

export interface TripLook {
  label: string;
  /** Null for evening looks (dinner out, formal event). */
  date: string | null;
  occasion: Occasion | null;
  pieces: GeneratedOutfit['pieces'];
  /** Hard rule 7: always present. */
  reason: string;
  tags: string[];
}

export interface TripGap {
  kind: 'warm_layer' | 'closed_shoes' | 'dressy_piece';
  text: string;
}

export interface TripPlan {
  /** The place as the weather service named it, e.g. "Baguio City". */
  place: string;
  starts_on: string;
  ends_on: string;
  occasions: TripOccasion[];
  /** Empty when the trip is more than 16 days away or the forecast was unavailable. */
  forecast: TripDay[];
  looks: TripLook[];
  packed_ids: string[];
  gaps: TripGap[];
  layer_note: string | null;
  generator_v: string;
}

export interface TripRequest {
  place: string;
  starts_on: string;
  ends_on: string;
  occasions: TripOccasion[];
}

export function planTrip(body: TripRequest): Promise<TripPlan> {
  return request<TripPlan>('/api/trips/plan', { method: 'POST', auth: true, body: JSON.stringify(body) });
}

export type WeekOccasion = 'casual' | 'class' | 'work' | 'date' | 'travel';

export interface WeekPlan {
  /** "Metro Manila" when using the default area; null when using the user's own coarse location. */
  place: string | null;
  forecast: TripDay[];
  looks: TripLook[];
  generator_v: string;
}

export function planWeek(body: { start: string; weekday: WeekOccasion; weekend: WeekOccasion; lat?: number; lon?: number }): Promise<WeekPlan> {
  return request<WeekPlan>('/api/week/plan', { method: 'POST', auth: true, body: JSON.stringify(body) });
}
