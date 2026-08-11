import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://knowyourself.selfkit.art';
  return [
    { url: base, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/consult`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
