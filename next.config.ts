import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**'
      }
    ]
  },
  async redirects() {
    return [
      {
        source: "/((?!_next|api|assets|favicon.ico).+)",
        destination: "/",
        permanent: false,
        missing: [
          {
            type: "host",
            value: "localhost",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
