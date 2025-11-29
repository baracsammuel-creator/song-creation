/** @type {import('next').NextConfig} */
const nextConfig = {
  // Această linie îi spune lui Next.js să genereze un export static
  // care va crea folderul `out`.
  output: 'export',

  // Decomentează și configurează dacă site-ul tău va fi într-un subdirector (ex: user.github.io/repo-name)
  // basePath: '/song-creation',
};

module.exports = nextConfig;