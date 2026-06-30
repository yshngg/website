### Task 2 Report: Base template changes

**Status:** Complete

**Commit:** `a9d006e` — `feat: add OG/Twitter meta tags, page descriptions, back-to-top button to base template`

**Build result:** `zola build` succeeds (28 pages, 4 sections, 198ms)

**Files modified:**

- `templates/base.html`

**Changes made:**

1. **Page description with fallbacks** — Replaced static `<meta name="description">` with Tera logic that falls back: page description → section description → site config description.

2. **OG/Twitter meta tags** — Added `og:title`, `og:description`, `og:type`, `og:url`, `twitter:card`, `twitter:title`, `twitter:description` meta tags in `<head>`.

3. **Back-to-top button** — Added `<button class="back-to-top" id="back-to-top">` before `</body>`.

**Deviations from brief:**

- Used `{{ config.title }}` directly for `og:title` instead of `{% block title %}` — Tera does not allow duplicate block names; `title` block is already defined on the `<title>` element.
- Wrapped `og:url` in `{% if current_url %}` check — `current_url` is not available in 404 page context.

**Concerns:** None.
