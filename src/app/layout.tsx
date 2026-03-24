import 'locomotive-scroll/dist/locomotive-scroll.css';
import type { Metadata } from "next";


import { UploadProgressProvider } from "@/app/contexts/UploadProgress.context";
import { CookieConsent } from "@/components/CookieConsent";
import Header from "@/components/Header";
import { UploadProgressBar } from "@/components/UploadProgressBar";
import "./globals.css";

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
