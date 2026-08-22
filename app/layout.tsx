import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vybe.app";

export const metadata: Metadata = {
  title: "VYBE",
  description:
    "An immersive, cinematic music discovery experience. Pick a vibe and press play.",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: "VYBE",
    description: "Pick a vibe. Press play.",
    type: "website",
    url: appUrl,
    siteName: "VYBE",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VYBE",
    description: "Pick a vibe. Press play.",
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
  width: "device-width" as const,
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${syne.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-black focus:shadow-lg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
