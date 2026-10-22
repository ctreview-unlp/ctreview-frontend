import { NextResponse } from "next/server";

// Maintenance mode: with MAINTENANCE_MODE=on (set in Vercel, then redeploy)
// every page shows a short "temporarily unavailable" notice with status 503,
// so visitors don't run into errors while the backend is offline. Remove the
// variable (or set it to "off") and redeploy to bring the app back.

const MAINTENANCE_PAGE = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Coachtribe Review – tijdelijk niet beschikbaar</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
           background: #f7f7f8; color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 440px; margin: 24px; padding: 40px 32px; background: #fff; border-radius: 16px;
           box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06); text-align: center; }
    img { width: 120px; height: auto; margin-bottom: 20px; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { margin: 0; line-height: 1.6; color: #4b5563; }
  </style>
</head>
<body>
  <main>
    <img src="/cr-logo.png" alt="Coachtribe Review">
    <h1>Tijdelijk niet beschikbaar</h1>
    <p>Coachtribe Review is even offline voor onderhoud. We zijn zo snel mogelijk weer terug.</p>
  </main>
</body>
</html>`;

export function proxy() {
  if (process.env.MAINTENANCE_MODE !== "on") {
    return NextResponse.next();
  }
  return new NextResponse(MAINTENANCE_PAGE, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "3600",
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  // Every page, but not Next.js assets or image files (the logo must still load).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
