import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ToastHost } from "@/components/ui/Toast";
import { LiveTranslator } from "@/components/LiveTranslator";
import { AssistLayer } from "@/components/AssistLayer";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { THEME_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Sebastian — your intelligent concierge",
  description: "Finding, planning and discovering, with a butler's composure.",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Sebastian", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FCFBF9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Poppins:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <ToastHost />
        <LiveTranslator />
        <AssistLayer />
        <Analytics />
        <GoogleAnalytics />
        {/* Pushify push notifications (its service worker is /pushify.js at the site root) */}
        <Script id="pushify-pixel" src="https://pushify.com/pixel/kEM0fmU63n1wBZia.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
