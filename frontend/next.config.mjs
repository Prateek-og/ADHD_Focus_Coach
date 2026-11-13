/** @type {import('next').NextConfig} */
const nextConfig = {
  // The main page.js uses imperative DOM manipulation (prototype pattern).
  // Disable React strict mode so effects don't run twice in development.
  reactStrictMode: false,
};

export default nextConfig;
