import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE, DEVICE_ID } from "@/lib/server/device";

const DEVICE_MAX_AGE_S = 400 * 24 * 60 * 60;

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(DEVICE_COOKIE)?.value;
  if (existing && DEVICE_ID.test(existing)) return NextResponse.next();

  // Also set it on this request, so a route reached on the very first visit
  // already sees the device.
  const device = crypto.randomUUID();
  req.cookies.set(DEVICE_COOKIE, device);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(DEVICE_COOKIE, device, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_MAX_AGE_S,
  });
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|svg|webp|ico|txt)$).*)",
  ],
};
