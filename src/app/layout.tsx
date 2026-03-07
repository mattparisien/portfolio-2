import type { Metadata } from "next";
import 'locomotive-scroll/dist/locomotive-scroll.css';


import "./globals.css";
import SmoothScroller from "@/components/SmoothScroller";

export const metadata: Metadata = {
  title: "Queer Wall * The internet's first infinite queer artboard",
  description: "Queer Wall — The internet's first infinite queer artboard",
  icons: [
    { rel: "icon", type: "image/svg+xml", url: "/favicon.svg", sizes: "16x16" }, // optional

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
        <link
          rel="preload"
          href="/assets/fonts/Fontspring-DEMO-freigeist-conlight.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <meta name="robots" content="noindex, nofollow"></meta>

      </head>
      <body className="antialiased" suppressHydrationWarning>
        <SmoothScroller>
          {children}
        </SmoothScroller>
      </body>
    </html>
  );
}
