### Task 2: Base template — OG/Twitter meta, page descriptions, back-to-top button

**Files:**

- Modify: `templates/base.html`

**Interfaces:**

- Consumes: Zola page/section/config variables for title and description

---

- [ ] **Step 1: Add page description and social meta tags to `<head>`**

In `templates/base.html`, replace the existing meta description line (line 6):

```html
<meta name="description" content="{{ config.description }}" />
```

With the following block:

```html
{% set meta_desc = "" %} {%- if page.description -%} {% set_global meta_desc =
page.description %} {%- elif section.description -%} {% set_global meta_desc =
section.description %} {%- else -%} {% set_global meta_desc = config.description
%} {%- endif -%}
<meta name="description" content="{{ meta_desc }}" />

<meta
  property="og:title"
  content="{% block title %}{{ config.title }}{% endblock %}"
/>
<meta property="og:description" content="{{ meta_desc }}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="{{ current_url | safe }}" />
<meta name="twitter:card" content="summary" />
<meta
  name="twitter:title"
  content="{% block twitter_title %}{{ config.title }}{% endblock %}"
/>
<meta name="twitter:description" content="{{ meta_desc }}" />
```

Note: The `{% block title %}` and `{% block twitter_title %}` blocks need to be defined. Since `title` block already exists (line 5), reuse it for og:title. For twitter:title, add a new fallback block.

---

- [ ] **Step 2: Add back-to-top button HTML**

In base.html, add just before the closing `</body>` tag but after the footer:

```html
<button
  class="back-to-top"
  id="back-to-top"
  aria-label="Back to top"
  title="Back to top"
>
  &uarr;
</button>
```

Insert it between `</footer>` and `</body>` (after line 57):

```html
    </footer>
    <button class="back-to-top" id="back-to-top" aria-label="Back to top" title="Back to top">&uarr;</button>
  </body>
```

---

- [ ] **Step 3: Build and verify**

```bash
zola build
```

Check generated HTML has OG and Twitter meta tags.

---

- [ ] **Step 4: Commit**

```bash
git add -f templates/base.html
git commit -m "feat: add OG/Twitter meta tags, page descriptions, back-to-top button to base template"
```

---
