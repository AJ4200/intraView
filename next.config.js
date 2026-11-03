const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep database drivers out of the bundle.
  serverExternalPackages: ['pg', 'commonfunlib', 'nodemailer'],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/(i|dashboard|api)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}

module.exports = nextConfig
