import { Request, Response, Router } from "express";

/**
 * HTTPS App Link / Universal Link fallback pages.
 * When the OS does not hand the URL to the installed app (or app is missing),
 * the browser hits the API host — these routes open the custom scheme instead
 * of returning the JSON 404 handler.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function deepLinkPage(options: {
  title: string;
  message: string;
  appUrl: string;
}): string {
  const title = escapeHtml(options.title);
  const message = escapeHtml(options.message);
  // Keep app URL for href/meta — only allow our custom scheme payloads we build.
  const appUrl = options.appUrl;
  const appUrlAttr = escapeHtml(appUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${appUrlAttr}" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(160deg, #f4f7fb 0%, #e8eef6 100%);
      color: #1a2332;
      padding: 24px;
    }
    .card {
      max-width: 420px;
      width: 100%;
      background: #fff;
      border-radius: 20px;
      padding: 28px 24px;
      box-shadow: 0 12px 40px rgba(26, 35, 50, 0.08);
      text-align: center;
    }
    h1 { font-size: 1.35rem; margin: 0 0 10px; }
    p { margin: 0 0 22px; line-height: 1.45; color: #4b5565; }
    a.btn {
      display: inline-block;
      background: #1f6feb;
      color: #fff;
      text-decoration: none;
      font-weight: 700;
      padding: 14px 22px;
      border-radius: 14px;
    }
    .hint { margin-top: 18px; font-size: 0.85rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" id="open" href="${appUrlAttr}">Open Anchor World</a>
    <p class="hint">If the app does not open, install Anchor World and tap the button again.</p>
  </div>
  <script>
    (function () {
      var url = ${JSON.stringify(appUrl)};
      try { window.location.replace(url); } catch (e) {}
      setTimeout(function () {
        try { window.location.href = url; } catch (e) {}
      }, 400);
    })();
  </script>
</body>
</html>`;
}

function firstQueryValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

export const deepLinkRouter = Router();

deepLinkRouter.get("/reset-password", (req: Request, res: Response) => {
  const token =
    firstQueryValue(req.query.token) ||
    firstQueryValue(req.query.reset_token) ||
    firstQueryValue(req.query.resetToken) ||
    firstQueryValue(req.query.code);

  if (!token) {
    res
      .status(400)
      .type("html")
      .send(
        deepLinkPage({
          title: "Invalid reset link",
          message: "This password reset link is missing a token. Request a new one from the app.",
          appUrl: "anchor://reset-password",
        })
      );
    return;
  }

  const appUrl = `anchor://reset-password?token=${encodeURIComponent(token)}`;
  res
    .status(200)
    .type("html")
    .setHeader("Cache-Control", "no-store")
    .send(
      deepLinkPage({
        title: "Reset your password",
        message: "Opening Anchor World so you can choose a new password…",
        appUrl,
      })
    );
});

deepLinkRouter.get("/invite/:code", (req: Request, res: Response) => {
  const code = String(req.params.code || "")
    .trim()
    .toUpperCase();

  if (!code) {
    res
      .status(400)
      .type("html")
      .send(
        deepLinkPage({
          title: "Invalid invite",
          message: "This invite link is incomplete.",
          appUrl: "anchor://invite",
        })
      );
    return;
  }

  const appUrl = `anchor://invite/${encodeURIComponent(code)}`;
  res
    .status(200)
    .type("html")
    .setHeader("Cache-Control", "no-store")
    .send(
      deepLinkPage({
        title: "You're invited",
        message: "Opening Anchor World to finish signup with your invite code…",
        appUrl,
      })
    );
});
