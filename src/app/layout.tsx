import type { Metadata } from "next";
import 'locomotive-scroll/dist/locomotive-scroll.css';


import "./globals.css";
import SmoothScroller from "@/components/SmoothScroller";
import { UploadProgressProvider } from "@/app/contexts/UploadProgress.context";
import { UploadProgressBar } from "@/components/UploadProgressBar";
import { CookieConsent } from "@/components/CookieConsent";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Crumb",
  description: "Crumb — A queer collective infinite wall for collaborative creativity.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  icons: [
    { rel: "icon", type: "image/svg+xml", url: "/favicon.svg", sizes: "16x16" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow"></meta>
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <UploadProgressProvider>
          <UploadProgressBar />
          <CookieConsent />
          <Header />
          {children}

        </UploadProgressProvider>
      </body>
    </html>
  );
}
