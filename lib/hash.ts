import crypto from 'crypto';

export async function sha256FromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch media (${res.status})`);
  }

  const hash = crypto.createHash('sha256');
  // @ts-ignore - Node/Undici body is async iterable
  for await (const chunk of res.body) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}
