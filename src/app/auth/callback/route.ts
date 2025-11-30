import { createAuthServerClient } from "../../../lib/supabase/auth-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin
  const redirect = requestUrl.searchParams.get("redirect") || "/"

  if (code) {
    const supabaseAuth = await createAuthServerClient()
    await supabaseAuth.auth.exchangeCodeForSession(code)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}${redirect}`)
}
