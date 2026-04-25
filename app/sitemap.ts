import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://dbml.vercel.app',
            lastModified: new Date(),
        },
        {
            url: 'https://dbml.vercel.app/view',
            lastModified: new Date(),
        }
    ]
}