import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";
const SIGNED_URL_TTL_SECONDS = parseInt(process.env.NEXT_PUBLIC_SUPABASE_SIGNED_TTL || "7200", 10);
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const explicitAllowedHosts = new Set<string>();
try {
  if (SUPABASE_URL) {
    const parsed = new URL(SUPABASE_URL);
    if (parsed.hostname) {
      explicitAllowedHosts.add(parsed.hostname.toLowerCase());
    }
  }
} catch {
  // ignore malformed env
}

function isAllowedStorageUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) {
      return false;
    }
    const host = (url.hostname || "").toLowerCase();
    if (explicitAllowedHosts.has(host)) return true;
    if (host.endsWith(".supabase.co")) return true;
    if (host.endsWith(".supabase.in")) return true;
    if (host.endsWith(".supabase.net")) return true;
    return false;
  } catch {
    return false;
  }
}

function normalizeStoragePath(path: string | null) {
  if (!path) return null;
  const trimmed = path.replace(/^\/+/, "");
  // If path includes bucket prefix like "media/...", remove the bucket name
  if (trimmed.startsWith(`${STORAGE_BUCKET}/`)) {
    return trimmed.slice(STORAGE_BUCKET.length + 1);
  }
  return trimmed;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path");
    const rawUrl = url.searchParams.get("url");

    let targetUrl: string | null = null;

    if (rawUrl) {
      if (!isAllowedStorageUrl(rawUrl)) {
        return NextResponse.json(
          { error: "Only Supabase storage URLs are allowed" },
          { status: 400 }
        );
      }
      // If caller passes an absolute Supabase URL (signed or public), use it directly
      targetUrl = rawUrl;
    } else if (rawPath) {
      const clean = normalizeStoragePath(rawPath);
      if (!clean) return NextResponse.json({ error: "invalid path" }, { status: 400 });
      // create signed URL server-side
      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(clean, SIGNED_URL_TTL_SECONDS);
      if (error) {
        console.warn("[GET /api/media/stream] createSignedUrl error", error);
        // fallback to public url
        const { data: pub } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(clean);
        targetUrl = pub?.publicUrl || null;
      } else {
        targetUrl = data?.signedUrl || null;
      }
    } else {
      return NextResponse.json({ error: "path or url required" }, { status: 400 });
    }

    if (!targetUrl) return NextResponse.json({ error: "no target url" }, { status: 404 });

    // Fetch the media server-side and stream it back with permissive CORS so the browser
    // can use it from our domain (avoids bucket CORS issues when using signed URLs).
    // Forward Range and related headers so the browser can request partial content
    const forwardedHeaders: Record<string, string> = {};
    const range = req.headers.get('range');
    const ifRange = req.headers.get('if-range');
    const accept = req.headers.get('accept');
    if (range) forwardedHeaders['range'] = range;
    if (ifRange) forwardedHeaders['if-range'] = ifRange;
    if (accept) forwardedHeaders['accept'] = accept;

    let res;
    try {
      res = await fetch(targetUrl, { headers: forwardedHeaders });
    } catch (fetchErr: any) {
      console.error("[GET /api/media/stream] fetch exception", { targetUrl, fetchErr });
      return NextResponse.json({ error: "exception fetching upstream media", details: String(fetchErr) }, { status: 502 });
    }

    // If upstream returned non-OK (including 4xx/5xx), propagate status and small body snippet
    if (!res.ok) {
      let txt = null;
      try {
        txt = await res.text();
      } catch (e) {
        txt = `<unable to read body: ${String(e)}>`;
      }
      console.error("[GET /api/media/stream] upstream fetch failed", { status: res.status, statusText: res.statusText, bodySnippet: txt && txt.slice ? txt.slice(0, 200) : txt, targetUrl });
      const errHeaders = new Headers();
      errHeaders.set('Content-Type', 'application/json');
      errHeaders.set('Access-Control-Allow-Origin', '*');
      return new NextResponse(JSON.stringify({ error: 'upstream fetch failed', upstreamStatus: res.status, upstreamText: txt && txt.slice ? txt.slice(0,200) : txt }), { status: res.status, headers: errHeaders });
    }

    // Copy relevant headers from upstream and add CORS
    const headers = new Headers();
    const contentType = res.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
    const contentLength = res.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);
    const acceptRanges = res.headers.get('accept-ranges');
    if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
    const contentRange = res.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);
    // Cache control: aggressive caching for media files (immutable content)
    const upstreamCache = res.headers.get('cache-control');
    // Media files are immutable - cache for 1 year with stale-while-revalidate
    headers.set('Cache-Control', upstreamCache || 'public, max-age=31536000, immutable, stale-while-revalidate=86400');
    headers.set('Access-Control-Allow-Origin', '*');
    // Add ETag if available for conditional requests
    const etag = res.headers.get('etag');
    if (etag) headers.set('ETag', etag);

    return new NextResponse(res.body, { status: res.status, headers });
  } catch (err: any) {
    console.error("[GET /api/media/stream] Exception", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
