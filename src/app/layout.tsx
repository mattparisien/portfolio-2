import 'locomotive-scroll/dist/locomotive-scroll.css';
import type { Metadata } from "next";


import "./globals.css";

export const metadata: Metadata = {
  title: "Crumb",
  description: "Crumb — A queer collective infinite wall for collaborative creativity.",
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
        <meta name="robots" content="noindex, nofollow"></meta>
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
