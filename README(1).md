This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Supabase media previews (video/audio thumbnails)

- Bucket: ensure CORS on bucket `media`:
	- Allowed origins: `*` (or your domains), methods: `GET, HEAD, OPTIONS`, headers: `*`, expose: `Content-Type`, max-age: `86400`.
- Signed URL TTL: `NEXT_PUBLIC_SUPABASE_SIGNED_TTL` controls expiry; keep it ≥ 3600 to avoid frequent re-sign. API routes already re-sign returned URLs for media and thumbnails.
- Storage paths: prefer storing `media_storage_path` / `media_thumbnail_path` (not pre-signed URLs); the API re-firma automaticamente i percorsi in risposta.
- If uploading client-side, store only the storage path (e.g. `media/projects/{projectId}/file.mp4`) and let the API sign it. Avoid salvare URL firmati nel DB.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
