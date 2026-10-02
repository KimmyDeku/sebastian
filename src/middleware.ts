import { NextResponse, type NextRequest } from "next/server";

/**
 * Trial gate for Sebastian's server functions (the ones that use paid APIs).
 * Switched on by NEXT_PUBLIC_TRIAL_DAYS and/or NEXT_PUBLIC_TRIAL_END_DATE.
 * - Requests must come from a signed-in Supabase account.
 * - Each account can use them for TRIAL_DAYS after signing up (and never after TRIAL_END_DATE).
 * - Emails in TRIAL_EXEMPT_EMAILS (for example, yours) are never cut off.
 */
export const config = { matcher: ["/api/:path*"] };

// Always available: feedback, the reminder scheduler, payment callbacks and images.
const OPEN = [/^\/api\/contact/, /^\/api\/push\/run/, /^\/api\/billing\/paynow-result/, /^\/api\/places\/photo/, /^\/api\/images\//];
const cache = new Map<string, { email: string; created: number; until: number }>();

export async function middleware(req: NextRequest) {
  const days = Number(process.env.NEXT_PUBLIC_TRIAL_DAYS || 0);
  const endDate = process.env.NEXT_PUBLIC_TRIAL_END_DATE || "";
  if (!days && !endDate) return NextResponse.next();
  if (OPEN.some((r) => r.test(req.nextUrl.pathname))) return NextResponse.next();

  const deny = (code: string, error: string, status = 403) => NextResponse.json({ ok: false, code, error }, { status });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return deny("not_configured", "Sign-in isn't set up on the server.", 503);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return deny("sign_in_required", "Please sign in to use Sebastian.", 401);

  // Check the sign-in with Supabase (remembered for a few minutes).
  let u = cache.get(token);
  if (!u || u.until < Date.now()) {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: anon } }).catch(() => null);
    if (!r || !r.ok) return deny("sign_in_required", "Your session has expired. Please sign in again.", 401);
    const j = await r.json();
    u = { email: String(j.email || "").toLowerCase(), created: new Date(j.created_at).getTime(), until: Date.now() + 5 * 60000 };
    if (cache.size > 1000) cache.clear();
    cache.set(token, u);
  }

  const exempt = (process.env.TRIAL_EXEMPT_EMAILS || "").toLowerCase().split(/[,\s]+/).filter(Boolean);
  if (exempt.includes(u.email)) { const res = NextResponse.next(); res.headers.set("x-sebastian-trial", "exempt"); return res; }

  const ends = Math.min(days ? u.created + days * 86400000 : Infinity, endDate ? new Date(endDate).getTime() : Infinity);
  if (Date.now() > ends) return deny("trial_ended", "Your free trial of Sebastian has ended. Thank you for testing it!");
  const res = NextResponse.next();
  res.headers.set("x-sebastian-trial", new Date(ends).toISOString());
  return res;
}
