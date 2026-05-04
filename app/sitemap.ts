import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://seeqldb.adventhq.com',
            lastModified: new Date(),
        },
        {
            url: 'https://seeqldb.adventhq.com/view',
            lastModified: new Date(),
        }
    ]
}