import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const locales = routing.locales;

    const staticPaths = ['', '/templates'];

    const routes = locales.flatMap((locale) =>
        staticPaths.map((path) => ({
            url: `${baseUrl}/${locale}${path}`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: path === '' ? 1 : 0.8,
        }))
    );

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...routes,
    ];
}