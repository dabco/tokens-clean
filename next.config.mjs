/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'payment=()',
              'usb=()',
              'bluetooth=()',
              'serial=()',
              'hid=()',
              'clipboard-read=()',
              'clipboard-write=(self)',
            ].join(', '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
