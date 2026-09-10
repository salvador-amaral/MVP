import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cookie shape accepted by next/headers cookieStore.set().
export interface CookieToSet {
  name: string;
  value: string;
  options?: {
    path?: string;
    maxAge?: number;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none";
    expires?: Date;
  };
}

/**
 * Server-side Supabase client that talks to Postgres AS the signed-in staff
 * user. Row Level Security therefore enforces tenant isolation on every query.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const rememberMe = cookieStore.get("remember")?.value === "1";

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                path: options?.path ?? "/",
                // With "remember me" the session survives browser restarts.
                ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
              })
            );
          } catch {
            // Called from a Server Component. Safe to ignore when middleware
            // is refreshing sessions.
          }
        },
      },
    }
  );
}
