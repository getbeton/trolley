import { createAuthServerClient } from "../../../lib/supabase/auth-server"
import { NextResponse } from "next/server"
import { validateReturnURL } from "../../../lib/utils/domain"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const returnParam = requestUrl.searchParams.get("return")
  const origin = requestUrl.origin

  // Default redirect (legacy behavior for relative paths)
  let redirectURL = `${origin}/`

  // If return URL provided (new centralized auth flow), validate and use it
  if (returnParam) {
    if (validateReturnURL(returnParam)) {
      redirectURL = returnParam
    } else {
      console.error("Invalid return URL:", returnParam)
      // Redirect to signin with error
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent("Invalid return URL")}`
      )
    }
  }

  if (code) {
    const supabaseAuth = await createAuthServerClient()
    const { error } = await supabaseAuth.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth callback error:", error)
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent(error.message)}`
      )
    }
  }

  // Redirect to the return URL or default
  return NextResponse.redirect(redirectURL)
}
