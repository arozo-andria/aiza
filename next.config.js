const buildDate = new Date().toISOString().slice(0, 10);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Baked in at build time so the KB's "last_verified" date reflects when
    // this build was shipped, per the MVP spec.
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  // Lets `npm run dev` be reached from another device on the same Wi-Fi
  // (e.g. a phone at http://<mac-lan-ip>:3000) for real-device testing.
  // Without this, Next's dev client can't open its HMR websocket from that
  // origin, retries fail silently, and it falls back to reloading the page
  // - which looks exactly like "buttons don't work" (typed input/clicks
  // vanish mid-interaction). Add your Mac's current LAN IP here if it
  // changes (System Settings > Wi-Fi > Details, or `ipconfig getifaddr en0`).
  allowedDevOrigins: ["10.41.196.13"],
};

module.exports = nextConfig;
