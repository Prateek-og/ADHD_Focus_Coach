/** @type {import('next').NextConfig} */
const nextConfig = {
  // The main page.js uses imperative DOM manipulation (prototype pattern).
  // Disable React strict mode so effects don't run twice in development.
  reactStrictMode: false,
  // Hide the floating Next.js "N" dev-indicator badge on the UI.
  devIndicators: false,
  // The app is often opened at 127.0.0.1 instead of localhost; without this
  // Next.js blocks its own dev assets (HMR, fonts) as cross-origin.
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
