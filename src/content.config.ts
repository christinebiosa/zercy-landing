import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postSchema = z.object({
  title: z.string(),
  metaTitle: z.string().optional(),
  description: z.string(),
  pubDate: z.date(),
  updatedDate: z.date().optional(),
  category: z.string(),
  readingTime: z.number(),
  heroImage: z.string().optional(),
  bookingDest: z.string().optional(),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: postSchema,
});

const blogen = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blogen' }),
  schema: postSchema,
});

const bloges = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/bloges' }),
  schema: postSchema,
});

export const collections = { blog, blogen, bloges };
