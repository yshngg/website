# Homepage Redesign — Design Doc

## Goal
Transform the current placeholder homepage (single heading) into a professional landing page that introduces Yusheng, showcases skills, recent content, and open source projects.

## Section Layout

```
┌─────────────────────────────────┐
│          HERO                   │
│   Yusheng                       │
│   An Open Source Developer      │
│   (centered, prominent)         │
├─────────────────────────────────┤
│          BIO / ABOUT            │
│   From content/_index.md body   │
│   Bilingual (EN/ZH)             │
│   Readable-width container      │
├─────────────────────────────────┤
│     SKILLS / TAGS               │
│   Grouped badge categories      │
│   Languages · Platforms · Obs   │
├─────────────────────────────────┤
│     RECENT BLOG POSTS           │
│   3 latest posts with dates     │
│   → View all blog posts         │
├─────────────────────────────────┤
│  FEATURED CURATED ARTICLES      │
│   4 hand-picked articles        │
│   → View all curated articles   │
├─────────────────────────────────┤
│  OPEN SOURCE PROJECTS           │
│   From data/projects.toml       │
│   Name · desc · GitHub link     │
└─────────────────────────────────┘
```

## Data Sources

| Section | Source | Bilingual? |
|---|---|---|
| Hero title | `content/_index.md` section title | ✅ |
| Hero tagline | `config.extra.tagline` | N/A |
| Bio | `content/_index.md` body content | ✅ |
| Skills | `config.extra.skills` (in `zola.toml`) | N/A |
| Recent Posts | `get_section("blog/_index.md")` sorted by date | Auto |
| Featured Articles | `config.extra.featured_articles` page paths | Auto |
| Projects | `data/projects.toml` | N/A |

## Files to Create/Modify

### 1. `content/_index.md` (new)
Homepage content page for English. Front matter with `title` and `template = "index.html"`. Body contains bio/about text.

### 2. `content/_index.zh.md` (new)
Chinese translation of the homepage content page.

### 3. `data/projects.toml` (new)
Open source project definitions:
```toml
[[projects]]
name = "prometheus-mcp-server"
description = "A Prometheus Model Context Protocol Server"
url = "https://github.com/yshngg/prometheus-mcp-server"

[[projects]]
name = "knowledge-base"
description = "Personal knowledge base"
url = "https://github.com/yshngg/knowledge-base"

[[projects]]
name = "ibus-ice"
description = "ibus-ice"
url = "https://github.com/yshngg/ibus-ice"

[[projects]]
name = "screenshot"
description = "A GTK+Rust screenshot tool for GNOME/Wayland with annotation support"
url = "https://github.com/yshngg/screenshot"
```

### 4. `templates/index.html` (rewrite)
Full homepage template with all 6 sections. No longer extends `base.html` content block — instead it builds the entire page layout using `config.extra` data, section queries, and page content.

### 5. `zola.toml` (modify)
Add `[extra]` section if needed for config-level data (e.g., featured article paths, skills categories).

## Template Pseudocode

```
{% extends "base.html" %}

{% block content %}

<section id="hero">
  <h1>{{ section.title }}</h1>
  <p>{{ config.extra.tagline }}</p>
</section>

<section id="about">
  {{ section.content | safe }}
</section>

<section id="skills">
  <h2>Skills</h2>
  {% for group in config.extra.skills %}
    <h3>{{ group.category }}</h3>
    {% for skill in group.items %}
      <span class="badge">{{ skill }}</span>
    {% endfor %}
  {% endfor %}
</section>

<section id="blog">
  <h2>Recent Posts</h2>
  {% set blog = get_section(path="blog/_index.md") %}
  {% for page in blog.pages | slice(end=3) %}
    <li><a href="{{ page.permalink }}">{{ page.title }}</a> · {{ page.date }}</li>
  {% endfor %}
  <a href="{{ get_url(path='@/blog/_index.md') }}">View all blog posts →</a>
</section>

<section id="curated">
  <h2>Featured Articles</h2>
  {% for path in config.extra.featured_articles %}
    {% set article = get_page(path=path) %}
    <li><a href="{{ article.permalink }}">{{ article.title }}</a></li>
  {% endfor %}
  <a href="{{ get_url(path='@/curated/_index.md') }}">View all curated articles →</a>
</section>

<section id="projects">
  <h2>Projects</h2>
  {% for project in load_data(path="data/projects.toml").projects %}
    <li><a href="{{ project.url }}">{{ project.name }}</a> — {{ project.description }}</li>
  {% endfor %}
</section>

{% endblock %}
```

## Skills Definition

```toml
# zola.toml [extra]
skills = [
  { category = "Languages", items = ["Go", "Python", "Rust", "Bash"] },
  { category = "Platforms", items = ["Kubernetes", "Docker", "Linux", "Cloud Native"] },
  { category = "Observability", items = ["Prometheus", "Grafana"] },
]
```

## Featured Articles

```toml
# zola.toml [extra]
featured_articles = [
  "curated/go-in-production/index.md",
  "curated/kubernetes-controllers/index.md",
  "curated/lxc-vs-docker/index.md",
  "curated/memory-layout/index.md",
]
```

`get_page` in template uses `"@" ~ path` prefix to resolve relative to content root.

## Styling Approach
- Existing Oat utility classes: `container`, `hstack`, `badge`, `gap-*`, `mt-*`, `mb-*`
- Sections separated by consistent vertical spacing (`mt-10`, `mb-10`)
- Bio text constrained with `max-width` for readability
- Skills rendered as Oat `badge` spans with consistent spacing
- No new CSS needed — all styles available in current Oat framework
