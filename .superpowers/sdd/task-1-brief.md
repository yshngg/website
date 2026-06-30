### Task 1: CSS — footer, responsive TOC, back-to-top, anchor links, post metadata, reading time

**Files:**

- Modify: `static/style.css`

**Interfaces:**

- Produces: CSS classes `.back-to-top`, `.toc-toggle`, `.post-meta`, `.reading-time`, `.post-nav`, `.zola-anchor`, responsive TOC media query

---

- [ ] **Step 1: Fix footer from fixed to normal flow**

In `static/style.css`, change the footer rule from `position: fixed` to normal flow:

```
footer {
  margin-top: var(--space-14);
}

footer hr { margin-bottom: var(--space-4); }
```

Replace the existing footer block (lines 61-66):

```css
footer {
  position: fixed;
  width: 100%;
  bottom: 0;
  background: var(--bg);
}
```

With:

```css
footer {
  margin-top: var(--space-14);
}

footer hr {
  margin-bottom: var(--space-4);
}
```

Also add bottom padding to `main` to replace the space the fixed footer used to occupy. Change line 35 from:

```css
main {
  padding-block-start: var(--space-8);
  padding-bottom: 4rem;
}
```

To:

```css
main {
  padding-block-start: var(--space-8);
  padding-bottom: 2rem;
}
```

---

- [ ] **Step 2: Add responsive TOC styles**

Add below the existing `.post-toc` block (after line 252):

```css
.toc-toggle {
  display: none;
  margin-bottom: var(--space-4);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-7);
  font-family: var(--font-sans);
  background: var(--accent);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}

@media (max-width: 767px) {
  .post-layout {
    flex-direction: column;
  }
  .post-toc {
    flex: none;
    position: static;
    display: none;
  }
  .post-toc.open {
    display: block;
    margin-bottom: var(--space-4);
  }
  .toc-toggle {
    display: inline-block;
  }
}
```

---

- [ ] **Step 3: Add back-to-top button styles**

Add at the end of the file:

```css
.back-to-top {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  background: var(--accent);
  color: var(--primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast);
  z-index: 50;
}

.back-to-top.visible {
  opacity: 1;
  pointer-events: auto;
}
```

---

- [ ] **Step 4: Add heading anchor link styling**

Add at the end of the file:

```css
.content .zola-anchor {
  position: absolute;
  right: 100%;
  padding-right: 0.5rem;
  font-size: 0.85em;
  text-decoration: none;
  opacity: 0;
  transition: opacity 0.15s;
  color: var(--muted);
}

.content h1:hover .zola-anchor,
.content h2:hover .zola-anchor,
.content h3:hover .zola-anchor,
.content h4:hover .zola-anchor,
.content h5:hover .zola-anchor,
.content h6:hover .zola-anchor {
  opacity: 0.5;
}

.content h1,
.content h2,
.content h3,
.content h4,
.content h5,
.content h6 {
  position: relative;
}
```

---

- [ ] **Step 5: Add post metadata and reading time styles**

Add at the end of the file:

```css
.post-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: var(--text-7);
  color: var(--muted);
  margin-bottom: var(--space-4);
}

.reading-time {
  color: var(--muted);
  font-style: italic;
}

.badge-taxonomy {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  background: var(--accent);
  color: var(--fg);
  border-radius: 9999px;
  text-decoration: none;
}

.badge-taxonomy:hover {
  background: var(--border);
}

.post-nav {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-14);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.post-nav a {
  max-width: 48%;
}
```

---

- [ ] **Step 6: Build and verify CSS**

```bash
zola build
```

Open the built output and verify no CSS syntax errors.

---

- [ ] **Step 7: Commit**

```bash
git add -f static/style.css
git commit -m "feat: enhance CSS with footer fix, responsive TOC, back-to-top, anchor links, post metadata styles"
```

---
