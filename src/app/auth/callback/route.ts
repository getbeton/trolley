import { createAuthServerClient } from "../../../lib/supabase/auth-server"
import { NextResponse } from "next/server"
import { validateReturnURL } from "../../../lib/utils/domain"

const RETURN_COOKIE_NAME = "beton_return"
const DEFAULT_REDIRECT = "https://trolley.getbeton.ai/"

function parseCookie(header: string | null, name: string) {
  if (!header) return null
  const cookies = header.split(";")
  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.trim().split("=")
    if (cookieName === name) {
      try {
        return decodeURIComponent(rest.join("="))
      } catch (error) {
        console.error("[auth-callback] Failed to decode beton_return cookie", error)
      }
    }
  }
  return null
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const returnParam = requestUrl.searchParams.get("return")
  const origin = requestUrl.origin

  // Default redirect: trolley domain (Supabase strips query params from OAuth redirectTo)
  // If callback is on auth domain without return param, redirect to trolley
  let redirectURL = DEFAULT_REDIRECT

  const cookieReturn = parseCookie(request.headers.get("cookie"), RETURN_COOKIE_NAME)

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
  } else if (cookieReturn && validateReturnURL(cookieReturn)) {
    redirectURL = cookieReturn
    console.info("[auth-callback] Using beton_return cookie redirect")
  } else if (cookieReturn) {
    console.error("[auth-callback] Ignoring invalid beton_return cookie", cookieReturn)
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
  const response = NextResponse.redirect(redirectURL)

  const cookieDomain = origin.includes("getbeton.ai") ? ".getbeton.ai" : undefined
  response.cookies.set(RETURN_COOKIE_NAME, "", {
    path: "/",
    domain: cookieDomain,
    maxAge: 0,
    secure: Boolean(cookieDomain),
    sameSite: "lax",
  })

  return response
}
