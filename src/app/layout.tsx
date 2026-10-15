import type { Metadata, Viewport } from "next";
import "@fontsource/archivo-black/400.css";
import "@fontsource-variable/archivo/index.css";
import "./globals.css";
import { IMAGES, SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || SITE.url),
  title: {
    default: `${SITE.name} | Music video bingo for pubs, clubs and events`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    siteName: SITE.name,
    type: "website",
    locale: "en_NZ",
    images: [{ url: IMAGES.socialShare }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#141818",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NZ">
      <body>{children}</body>
    </html>
  );
}
