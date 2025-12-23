export function checkAdminSecret(
  req: Request,
  options?: { headerName?: string; envNames?: string[] }
) {
  const headerName = options?.headerName || "x-admin-secret";
  const envNames = options?.envNames || ["ADMIN_RESET_SECRET", "MIGRATION_SECRET"];
  const headerValue = req.headers.get(headerName) || "";
  const expected =
    envNames.map(name => process.env[name]).find(Boolean) || "";

  if (!expected) {
    return {
      ok: false,
      status: 500,
      error: "Admin secret not configured on server",
    };
  }

  if (!headerValue || headerValue !== expected) {
    return { ok: false, status: 403, error: "Not authorized" };
  }

  return { ok: true, status: 200 };
}
