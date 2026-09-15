const buildDate = new Date().toISOString().slice(0, 10);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Baked in at build time so the KB's "last_verified" date reflects when
    // this build was shipped, per the MVP spec.
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
};

module.exports = nextConfig;
