import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/chat', '/shared/'],
    },
    sitemap: 'https://knowyourself.selfkit.art/sitemap.xml',
  };
}
