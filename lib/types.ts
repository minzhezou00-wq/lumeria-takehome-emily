// The shape of a skin report, as returned by GET /api/reports/:id.
// See README.md → "The data" for what each field means.

export type MetricKey = "hydration" | "evenness" | "redness" | "pigmentation" | "oiliness";

/** Every score is 0–100 and HIGHER IS HEALTHIER (a redness score of 85 means calm skin). */
export interface Scores {
  hydration: number;
  evenness: number;
  redness: number;
  pigmentation: number;
  /** null when this scan couldn't measure oiliness. */
  oiliness: number | null;
  /** Average of the other scores that were measured. */
  overall: number;
}

export interface ScanSummary {
  /** One short line, e.g. "Your skin is looking better than last time". */
  headline: string;
  /** One to three plain-language sentences about what the scan saw. */
  observations: string[];
  /** A single suggestion to try. */
  tip: string;
}

/** Optional self-reported context the person logged around the scan. */
export interface Checkin {
  sleepHours: number;
  waterGlasses: number;
  /** 1 (relaxed) to 5 (very stressed) */
  stress: number;
}

/** What the person wrote or tagged on a scan. */
export interface Annotation {
  /** Free-text note, or null if they only tagged. */
  note: string | null;
  /** Quick "how my skin feels" tags, e.g. "Tight", "Calm". */
  tags: string[];
  /** Self-reported stress, 1 (relaxed) to 5 (very stressed). */
  stress: number;
}

/** Synced from a connected health app for the day of the scan. */
export interface HealthData {
  source: string;
  sleepHours: number;
  steps: number;
  restingHeartRate: number;
  /** Heart-rate variability in ms; higher generally means more rested. */
  hrvMs: number;
  waterGlasses: number;
  /** Day of the menstrual cycle (1 = first day of period). */
  cycleDay: number;
}

/** Where the scan was taken, plus that day's local conditions. */
export interface ScanLocation {
  city: string;
  region: string;
  lat: number;
  lon: number;
  tz: string;
  environment: {
    uvIndexMax: number;
    humidityPct: number;
    tempHighC: number;
    /** US Air Quality Index; lower is cleaner. */
    aqi: number;
  };
}

/** A product in the person's routine. In use from startDate through endDate. */
export interface Product {
  id: string;
  name: string;
  category: string;
  keyIngredients: string[];
  usage: string;
  /** yyyy-mm-dd */
  startDate: string;
  /** yyyy-mm-dd, or null if still in use. */
  endDate: string | null;
  stoppedReason?: string;
}

export interface Scan {
  id: string;
  /** ISO 8601 timestamp, UTC. */
  takenAt: string;
  /** The body area that was scanned, e.g. "Left cheek". */
  area: string;
  /** Close-up photo of the area. null if the photo failed to upload. */
  photoUrl: string | null;
  /**
   * Real scans only: the same spot under all three of the scope's lights.
   * ambient = normal white light, polarized = glare removed (shows redness and
   * pigment under the surface), uva = 365 nm UV (oil and porphyrins fluoresce).
   */
  photos?: { ambient: string; polarized: string; uva: string };
  scores: Scores;
  summary: ScanSummary;
  checkin?: Checkin;
  /** Only on the one-month report (`noor`). null = no annotation that time. */
  annotation?: Annotation | null;
  health?: HealthData;
  location?: ScanLocation;
}

export interface Person {
  firstName: string;
  age: number;
  /** null when the person skipped this during onboarding. */
  skinType: string | null;
  concerns: string[];
  connectedSources?: string[];
}

export interface SkinReport {
  id: string;
  generatedAt: string;
  person: Person;
  /** One-month report only: the window the data covers (yyyy-mm-dd). */
  period?: { start: string; end: string };
  /** One-month report only: the person's routine over the period. */
  products?: Product[];
  /** NOT guaranteed to be in any particular order. */
  scans: Scan[];
}
