import { createAuthServerClient } from "../../../lib/supabase/auth-server"
import { NextResponse } from "next/server"
import { validateReturnURL } from "../../../lib/utils/domain"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const returnParam = requestUrl.searchParams.get("return")
  const origin = requestUrl.origin

  // Default redirect: trolley domain (Supabase strips query params from OAuth redirectTo)
  // If callback is on auth domain without return param, redirect to trolley
  let redirectURL = "https://trolley.getbeton.ai/"

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
  } else if (origin.includes("trolley.getbeton.ai")) {
    // If callback is on trolley domain without return param, stay on trolley
    redirectURL = `${origin}/`
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
