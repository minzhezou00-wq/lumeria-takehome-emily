import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Skin Report",
  description: "Take-home starter",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
