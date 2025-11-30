import { Buffer } from "buffer"
import { createAuthServerClient } from "../../../lib/supabase/auth-server"
import { NextResponse } from "next/server"
import { validateReturnURL } from "../../../lib/utils/domain"

const DEFAULT_REDIRECT = "https://trolley.getbeton.ai/"

function decodeState(stateParam: string | null) {
  if (!stateParam) return null
  try {
    const json = Buffer.from(stateParam, "base64").toString("utf-8")
    const parsed = JSON.parse(json)
    if (parsed?.returnTo && typeof parsed.returnTo === "string") {
      return parsed.returnTo as string
    }
  } catch (error) {
    console.error("[auth-callback] Failed to decode state payload", error)
  }
  return null
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const returnParam = requestUrl.searchParams.get("return")
  const stateParam = requestUrl.searchParams.get("state")
  const origin = requestUrl.origin

  // Default redirect: trolley domain (Supabase strips query params from OAuth redirectTo)
  // If callback is on auth domain without return param, redirect to trolley
  let redirectURL = DEFAULT_REDIRECT

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
  } else {
    const decodedReturn = decodeState(stateParam)
    if (decodedReturn && validateReturnURL(decodedReturn)) {
      redirectURL = decodedReturn
      console.info("[auth-callback] Using state payload redirect")
    } else if (decodedReturn) {
      console.error("[auth-callback] Ignoring invalid state return URL", decodedReturn)
    } else if (origin.includes("trolley.getbeton.ai")) {
      // If callback is on trolley domain without state/return param, stay on trolley
      redirectURL = `${origin}/`
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
