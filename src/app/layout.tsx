import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Matthew Parisien",
  description: "Matthew Parisien — Software Developer",
  icons: [
    { rel: "icon", type: "image/svg+xml", url: "/favicon.svg", sizes: "16x16" }, // optional

  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
