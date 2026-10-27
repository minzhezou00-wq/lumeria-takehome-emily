import { existsSync } from "node:fs";
import { join } from "node:path";
import maya from "@/data/reports/maya.json";
import jordan from "@/data/reports/jordan.json";
import sam from "@/data/reports/sam.json";
import noor from "@/data/reports/noor.json";
import type { SkinReport } from "./types";

// Stand-in for a real database. Treat this as server-only. Your UI should
// fetch from /api/reports/:id the way a real client would.
const REPORTS: Record<string, SkinReport> = {
  noor: noor as SkinReport,
  maya: maya as SkinReport,
  jordan: jordan as SkinReport,
  sam: sam as SkinReport,
};

export const REPORT_IDS = Object.keys(REPORTS);

// Real photos saved as public/scans/<scanId>.jpg (plus optional
// <scanId>-polarized.jpg and <scanId>-uva.jpg) replace that scan's generated
// placeholder, with no code changes needed.
const has = (file: string) => existsSync(join(process.cwd(), "public/scans", file));

function withRealPhotos(report: SkinReport): SkinReport {
  return {
    ...report,
    scans: report.scans.map((s) => {
      if (!has(`${s.id}.jpg`)) return s;
      const photoUrl = `/scans/${s.id}.jpg`;
      const photos = has(`${s.id}-polarized.jpg`) && has(`${s.id}-uva.jpg`)
        ? { ambient: photoUrl, polarized: `/scans/${s.id}-polarized.jpg`, uva: `/scans/${s.id}-uva.jpg` }
        : undefined;
      return { ...s, photoUrl, ...(photos && { photos }) };
    }),
  };
}

export function findReport(id: string): SkinReport | undefined {
  const report = REPORTS[id];
  return report && withRealPhotos(report);
}
