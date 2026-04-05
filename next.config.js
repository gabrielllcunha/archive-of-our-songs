const pkg = require('./package.json')

function resolveAppVersion() {
  if (process.env.NEXT_PUBLIC_APP_VERSION) {
    return process.env.NEXT_PUBLIC_APP_VERSION
  }
  if (process.env.VERCEL_GIT_COMMIT_REF) {
    return process.env.VERCEL_GIT_COMMIT_REF
  }
  const ref = process.env.GITHUB_REF_NAME
  if (ref && /^(v?\d+\.\d+)/.test(ref)) {
    return ref
  }
  return pkg.version
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lastfm.freetls.fastly.net',
        pathname: '**',
      },
    ],
  },
}

module.exports = nextConfig
