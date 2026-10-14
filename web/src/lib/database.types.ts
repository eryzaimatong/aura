/**
 * Hand-written types for the tables the app touches so far.
 * Mirrors db/schema.sql — extend as each step adds tables.
 * (Can be replaced later by `supabase gen types typescript`.)
 */
import type { AgeBracket } from './ageBracket';

export type PlanTier = 'free' | 'premium';
export type ConsentKind = 'face_scan' | 'analytics' | 'marketing' | 'guardian';

export type ProfileRow = {
  id: string;
  display_name: string;
  age_bracket: AgeBracket;
  guardian_ok: boolean;
  region: string;
  units: string;
  plan: PlanTier;
  plan_renews_at: string | null;
  share_analytics: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  display_name: string;
  age_bracket: AgeBracket;
  guardian_ok?: boolean;
  region?: string;
  units?: string;
  share_analytics?: boolean;
};

export type ConsentRow = {
  id: string;
  user_id: string;
  kind: ConsentKind;
  granted: boolean;
  policy_ver: string;
  created_at: string;
};

export type ConsentInsert = {
  user_id: string;
  kind: ConsentKind;
  granted: boolean;
  policy_ver: string;
};

export type ItemCategory = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessory';

/** Shared catalogue; read-only to clients (service role writes). */
export type ProductRow = {
  id: string;
  merchant: string;
  external_id: string;
  title: string;
  category: ItemCategory;
  price_cents: number | null;
  currency: string;
  image_url: string | null;
  affiliate_url: string | null;
  dominant_colors: { hex: string; pct: number }[] | null;
  active: boolean;
  fetched_at: string;
};

export type FaceShape = 'heart' | 'oblong' | 'oval' | 'round' | 'square';
export type Undertone = 'cool' | 'warm' | 'neutral';
export type ColorSeason =
  | 'true_spring' | 'light_spring' | 'bright_spring'
  | 'true_summer' | 'light_summer' | 'soft_summer'
  | 'true_autumn' | 'soft_autumn' | 'deep_autumn'
  | 'true_winter' | 'bright_winter' | 'deep_winter';
export type CardSource = 'model' | 'quiz' | 'user_corrected';

/** Derived numbers only — the table has no image column, by design. */
export type ScanRow = {
  id: string;
  user_id: string;
  landmark_ratios: Record<string, number>;
  lab_skin: [number, number, number] | null;
  lab_hair: [number, number, number] | null;
  lab_eye: [number, number, number] | null;
  monk_band: number | null;
  lighting_score: number | null;
  model_version: string;
  device_hint: string | null;
  created_at: string;
};

export type AuraCardRow = {
  id: string;
  user_id: string;
  scan_id: string | null;
  face_shape: FaceShape;
  shape_conf: number;
  season: ColorSeason | null;
  season_conf: number | null;
  skin_undertone: Undertone | null;
  palette: string[];
  source: CardSource;
  is_current: boolean;
  created_at: string;
};

export type CorrectionTarget = 'season' | 'face_shape' | 'undertone' | 'all';

/** Training labels written by the API; read here to show which card fields the user set. */
export type CardCorrectionRow = {
  id: string;
  user_id: string;
  card_id: string;
  scan_id: string | null;
  target: CorrectionTarget;
  predicted: string;
  corrected_to: string | null;
  model_version: string;
  usable_label: boolean;
  created_at: string;
};

export type Seasonality = 'warm' | 'cool' | 'all';

export interface DominantColor {
  hex: string;
  pct: number;
  /** Shopper-friendly name, e.g. "cream" (added by the tagger). */
  name?: string;
}

/** Hard rule 8: no price field, by design. */
export type ClosetItemRow = {
  id: string;
  user_id: string;
  name: string;
  category: ItemCategory;
  subcategory: string | null;
  image_path: string;
  dominant_colors: DominantColor[];
  lab_primary: [number, number, number] | null;
  in_palette: boolean | null;
  auto_tagged: boolean;
  seasonality: Seasonality | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ClosetItemInsert = {
  user_id: string;
  name: string;
  category: ItemCategory;
  subcategory?: string | null;
  image_path: string;
  dominant_colors?: DominantColor[];
  lab_primary?: [number, number, number] | null;
  in_palette?: boolean | null;
  /** pgvector literal, e.g. "[0.01,-0.2,…]" (512 values). */
  embedding?: string | null;
  auto_tagged?: boolean;
  seasonality?: Seasonality | null;
};

export type WearLogRow = {
  id: string;
  user_id: string;
  item_id: string;
  outfit_id: string | null;
  worn_on: string;
  created_at: string;
};

export type WearStatsRow = {
  item_id: string;
  user_id: string;
  name: string;
  category: ItemCategory;
  wear_count: number;
  last_worn: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<Omit<ProfileInsert, 'id'>>;
        Relationships: [];
      };
      consents: {
        Row: ConsentRow;
        Insert: ConsentInsert;
        Update: never;
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      // Written by the API (POST /api/scan), read directly by the app.
      scans: {
        Row: ScanRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      aura_cards: {
        Row: AuraCardRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      card_corrections: {
        Row: CardCorrectionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      closet_items: {
        Row: ClosetItemRow;
        Insert: ClosetItemInsert;
        Update: Partial<Omit<ClosetItemInsert, 'user_id'>> & { archived?: boolean };
        Relationships: [];
      };
      wear_log: {
        Row: WearLogRow;
        Insert: { user_id: string; item_id: string; worn_on: string; outfit_id?: string | null };
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      item_wear_stats: {
        Row: WearStatsRow;
        Relationships: [];
      };
    };
    Functions: Record<never, never>;
    Enums: {
      age_bracket: AgeBracket;
      plan_tier: PlanTier;
    };
    CompositeTypes: Record<never, never>;
  };
};
