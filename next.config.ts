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
        source: "/:path+",
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
