import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";
const SIGNED_URL_TTL_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_SUPABASE_SIGNED_TTL || "7200",
  10
);

const signedUrlCache = new Map<
  string,
  { url: string; expiresAt: number }
>();

const isAbsoluteUrl = (url: string | null) =>
  !!url && /^https?:\/\//i.test(url || "");

function getCachedSignedUrl(path: string) {
  const entry = signedUrlCache.get(path);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    signedUrlCache.delete(path);
    return null;
  }
  return entry.url;
}

function setCachedSignedUrl(path: string, url: string, ttlSeconds?: number) {
  const expiresAt =
    Date.now() +
    Math.max(
      1000,
      ((ttlSeconds || SIGNED_URL_TTL_SECONDS) * 1000) - 5000
    );
  signedUrlCache.set(path, { url, expiresAt });
}

function normalizeStoragePath(path: string | null) {
  if (!path) return null;
  const trimmed = path.replace(/^\/+/, "");
  if (trimmed.startsWith(`${STORAGE_BUCKET}/`)) {
    return trimmed.slice(STORAGE_BUCKET.length + 1);
  }
  return trimmed;
}

function extractPathFromSupabaseUrl(url: string) {
  try {
    const u = new URL(url);
    const pathParts = u.pathname.split("/").filter(Boolean);
    const storageIdx = pathParts.findIndex((p) => p === "object");
    if (storageIdx >= 0) {
      const afterObject = pathParts.slice(storageIdx + 1);
      if (afterObject.length >= 2) {
        // /storage/v1/object/public/<bucket>/<path>
        if (
          afterObject[0] === "public" &&
          afterObject[1] === STORAGE_BUCKET
        ) {
          return afterObject.slice(2).join("/");
        }
        // /storage/v1/object/sign/<bucket>/<path>?token=...
        if (
          afterObject[0] === "sign" &&
          afterObject.length >= 2 &&
          afterObject[1] === STORAGE_BUCKET
        ) {
          return afterObject.slice(2).join("/");
        }
      }
    }
  } catch (err) {
    console.warn("[mediaUrlResolver] Failed to parse Supabase URL", {
      url,
      err,
    });
  }
  return null;
}

export function detectMediaType(
  nameOrPath: string | null
): "audio" | "video" | null {
  if (!nameOrPath) return null;
  const lower = nameOrPath.toLowerCase();
  if (
    /(\.mp3|\.wav|\.aiff|\.aif|\.flac|\.aac|\.m4a|\.ogg|\.oga|\.opus)$/.test(
      lower
    )
  ) {
    return "audio";
  }
  if (
    /(\.mp4|\.mov|\.mkv|\.webm|\.avi|\.m4v)$/.test(lower)
  ) {
    return "video";
  }
  return null;
}

export async function resolveMediaUrl(
  raw: string | null
): Promise<string | null> {
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;

  if (isAbsoluteUrl(raw)) {
    try {
      const lower = raw.toLowerCase();
      if (lower.includes("/object/sign/") || lower.includes("?token=")) {
        return raw;
      }
    } catch {
      // ignore parse errors and attempt to re-sign
    }
    const supaPath = SUPABASE_URL ? extractPathFromSupabaseUrl(raw) : null;
    if (!supaPath) return raw;
    raw = supaPath;
  }

  const cleanPath = normalizeStoragePath(raw);
  if (!cleanPath) return null;

  const cached = getCachedSignedUrl(cleanPath);
  if (cached) return cached;

  try {
    const t0 = Date.now();
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(cleanPath, SIGNED_URL_TTL_SECONDS);
    const took = Date.now() - t0;
    if (error) {
      console.error("[mediaUrlResolver] Signed URL error", {
        path: cleanPath,
        error,
        took,
      });
    } else {
      console.log("[mediaUrlResolver] Signed URL created", {
        path: cleanPath,
        took,
      });
    }

    if (data?.signedUrl) {
      setCachedSignedUrl(cleanPath, data.signedUrl, SIGNED_URL_TTL_SECONDS);
      return data.signedUrl;
    }
  } catch (err) {
    console.error("[mediaUrlResolver] Exception signing URL", err);
  }

  if (SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanPath}`;
  }

  return `/${cleanPath}`;
}

export function parseWaveformData(raw: any): number[] | number[][] | null {
  if (!raw) return null;
  let data: any = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  const toWaveformArray = (value: any) => {
    if (!value) return null;
    if (Array.isArray(value) && value.every(num => typeof num === "number")) {
      return value;
    }
    return null;
  };

  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === "object") {
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.samples)) return data.samples;
    if (Array.isArray(data.peaks)) return data.peaks;
    const left = toWaveformArray(data.left);
    const right = toWaveformArray(data.right);
    if (left && right) return [left, right];
    if (left) return left;
    if (right) return right;
  }

  return null;
}
