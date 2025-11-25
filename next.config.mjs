import withPwa from 'next-pwa';
/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
  }
};

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,  
};

const withPwaConfig = withPwa(nextConfig, pwaConfig);

export default withPwaConfig;