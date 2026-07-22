import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    // const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cvmatch-pro-v1-fresh-production.up.railway.app';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            // disallow: ['/api/', '/*/admin/', '/*/results/', '/*/dashboard/'],
            disallow: ['/api/', '/*/admin/', '/*/results/', '/*/dashboard/', '/*/templates/*/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}