import type { ReportView } from "@/lib/model";
import { areaPhoto } from "@/lib/detail";

// An area's newest photo: a real scope photo when there is one, otherwise the
// scan's own placeholder (cropped past its vignette).
export function AreaThumb({ v, area, size = 36 }: { v: ReportView; area: string; size?: number }) {
  const src = areaPhoto(v, area);
  return (
    <span
      className={`thumb ${src?.endsWith(".svg") ? "placeholder" : ""}`}
      style={{ width: size, height: size, backgroundImage: src ? `url(${src})` : undefined }}
      aria-hidden="true"
    />
  );
}
