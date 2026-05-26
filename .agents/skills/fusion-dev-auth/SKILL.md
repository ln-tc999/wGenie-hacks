---
name: fusion-dev-auth
description: Authenticate browser automation (Playwright MCP, agent-browser) with the Fusion web app at localhost:3000. Use when (1) navigating to localhost:3000 results in a redirect to /login, (2) the app requires SIWE (Sign-In with Ethereum) wallet authentication that browser automation cannot perform, (3) before any browser testing session that needs access to protected pages, or (4) when encountering auth-related errors during browser automation.
---

# Fusion Dev Auth

Authenticate headless browsers with the SIWE-protected Fusion web app by navigating to a dev-only login endpoint.

## Authenticate

Navigate to this URL before accessing any protected page:

```
http://localhost:3000/api/auth/dev-login
```

This creates a real Supabase session, sets cookies, and redirects to the dashboard. All subsequent navigations in the same browser session are authenticated.

### Playwright MCP

```
browser_navigate → http://localhost:3000/api/auth/dev-login
browser_snapshot  # Verify: dashboard content visible, not login page
```

### agent-browser

```bash
agent-browser open http://localhost:3000/api/auth/dev-login
agent-browser wait --load networkidle
agent-browser snapshot -i  # Verify: dashboard content visible
```

## Re-authenticate

Navigate to `/api/auth/dev-login` again if:
- The browser was closed and reopened
- Cookies were cleared
- Any page redirects to `/login`

## Constraints

- **Dev only**: Returns 403 unless `NODE_ENV=development` (local dev server)
- **No wallet needed**: Uses a server-side test key (Hardhat account 0)
- **Single step**: No form filling, clicking, or wallet interaction required
