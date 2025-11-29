const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // disable: process.env.NODE_ENV === 'development', // Dezactivează PWA în development
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Asigură-te că NU ai linia "output: 'export'" aici.
  // Poți adăuga alte configurații Next.js dacă ai nevoie
  // reactStrictMode: true,
};

module.exports = withPWA(nextConfig);