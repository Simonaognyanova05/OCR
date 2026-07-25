const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '..', 'public');
const siteUrl = (process.env.REACT_APP_SITE_URL || 'https://ocr-finance.onrender.com').replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);

const routes = [
  {
    path: '/ocr-fakturi-kasovi-belezhki',
    priority: '1.0',
  },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url>
    <loc>${siteUrl}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Disallow: /login
Disallow: /documents
Disallow: /workspace
Disallow: /company
Disallow: /admin

Sitemap: ${siteUrl}/sitemap.xml
`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots);
