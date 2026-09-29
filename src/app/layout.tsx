import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ToastHost } from "@/components/ui/Toast";
import { LiveTranslator } from "@/components/LiveTranslator";
import { AssistLayer } from "@/components/AssistLayer";
import { THEME_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Sebastian — your intelligent concierge",
  description: "Finding, planning and discovering, with a butler's composure.",
  icons: { icon: "/favicon.svg" },
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
      </body>
    </html>
  );
}
