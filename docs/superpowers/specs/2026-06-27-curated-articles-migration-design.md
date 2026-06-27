# Curated Articles Migration — Design Doc

## Goal
Migrate curated technical articles from `yshngg/` (a separate git repo) into the Zola website under `/curated/`.

## Section Structure

```
content/curated/
├── _index.md              # section listing, sort_by = "none"
├── _index.zh.md           # Chinese listing
├── almighty-pause-container/
│   ├── index.md           # English + images colocated
│   ├── index.zh.md        # Chinese translation
│   └── pause-container.png
├── containerd-design/
│   ├── index.md           # merged from README + 5 sub-articles
│   ├── index.zh.md        # merged from 5 Chinese sub-articles
│   ├── architecture.png
│   ├── data-flow.png
│   └── snapshot_model.png
├── flight-recorder/
│   ├── index.md
│   ├── index.zh.md
│   └── flight_recorder_{1..5}.png
├── go-in-production/
│   └── index.md
├── go-names-talk/
│   └── index.md
├── go-practical-openapi/
│   ├── index.md
│   ├── api-lifecycle.png
│   └── swagger-ui-screenshot.png
├── greenteagc/
│   ├── index.md
│   ├── index.zh.md
│   └── greenteagc/         # 84 PNGs + 1 SVG
├── kubernetes-controllers/
│   └── index.md
├── kubernetes-informers/
│   └── index.md            # merged from introduction/ + deep-dive/
├── kubernetes-leader-election/
│   └── index.md
├── kubernetes-operators/
│   ├── index.md
│   ├── example-1a.svg
│   ├── example-1b.svg
│   └── example-2.svg
├── lxc-vs-docker/
│   ├── index.md
│   ├── index.zh.md
│   └── {3 images}.png
├── memory-layout/
│   ├── index.md
│   └── {6 C source files}
├── node-problem-detector-v0/
│   ├── index.md
│   ├── system-diagram.png
│   └── logmonitor-architecture.png
├── prometheus-agent-mode-introduction/
│   ├── index.md
│   ├── index.zh.md
│   └── {3 PNGs + 1 WebP}
└── runc-docs/
    ├── index.md            # merged from README + 7 sub-articles
    ├── index.zh.md         # merged from 7 Chinese sub-articles
    └── Security-Audit.pdf
```

## Categories (Zola Taxonomy)

Grouped into 5 categories via Zola taxonomies:

| Category | Articles |
|---|---|
| **Go** | flight-recorder, go-in-production, go-names-talk, go-practical-openapi, greenteagc |
| **Kubernetes** | kubernetes-controllers, kubernetes-informers, kubernetes-leader-election, kubernetes-operators, node-problem-detector-v0 |
| **Containers** | almighty-pause-container, containerd-design, lxc-vs-docker, runc-docs |
| **Systems** | memory-layout |
| **Observability** | prometheus-agent-mode-introduction |

## Front Matter Convention

```toml
+++
title = "The Almighty Pause Container"
weight = 10

[extra]
author = "Ian Lewis"
original_url = "https://www.ianlewis.org/en/almighty-pause-container"

[taxonomies]
category = ["Containers"]
+++
```

Chinese versions get translated title, keep same `[extra]` and `[taxonomies]`.

Articles with existing `tags` or `summary` (e.g., greenteagc) preserve those fields.

## Configuration Changes (`zola.toml`)

```toml
[taxonomies]
category = { feed = true }
```

## New Templates

### `templates/curated.html`

Listing page that groups articles by category. Each category heading followed by its articles as links.

```jinja2
{% extends "base.html" %}
{% block content %}
<h1>{{ section.title }}</h1>

{% set categories = ["Go", "Kubernetes", "Containers", "Systems", "Observability"] %}
{% for cat in categories %}
<h2>{{ cat }}</h2>
<ul>
  {% for page in section.pages %}
    {% if cat in page.taxonomies.category %}
      <li>
        <a href="{{ page.permalink | safe }}">{{ page.title }}</a>
        {% if page.description %} &middot; {{ page.description }}{% endif %}
      </li>
    {% endif %}
  {% endfor %}
</ul>
{% endfor %}
{% endblock content %}
```

### `templates/curated-page.html`

Individual article page. Shows author, original source, language toggle, TOC sidebar.

```jinja2
{% extends "base.html" %}
{% block content %}
<h1>{{ page.title }}</h1>

{% if page.extra.author %}
<p class="subtitle">By {{ page.extra.author }}
  {% if page.extra.original_url %}
    &middot; <a href="{{ page.extra.original_url }}" target="_blank">Original source ↻</a>
  {% endif %}
</p>
{% endif %}

{% if page.translations %}
<p>
  {% for t in page.translations %}
    <a href="{{ t.permalink | safe }}">{{ t.lang | default(value="English") }}</a>
  {% endfor %}
</p>
{% endif %}

<div class="row">
  <div class="col-8">
    {{ page.content | safe }}
  </div>
  <div class="col-3 offset-1">
    {% if page.toc %}
    <ul class="toc">
      {% for h1 in page.toc %}
      <li class="toc-item depth-1">
        <a href="{{ h1.permalink | safe }}">{{ h1.title }}</a>
        {% if h1.children %}
        <ul>
          {% for h2 in h1.children %}
          <li class="toc-item depth-2">
            <a href="{{ h2.permalink | safe }}">{{ h2.title }}</a>
          </li>
          {% endfor %}
        </ul>
        {% endif %}
      </li>
      {% endfor %}
    </ul>
    {% endif %}
  </div>
</div>
{% endblock content %}
```

## Navigation Changes (`templates/base.html`)

Add after Blog link:
```html
<span>/</span>
<a href="{{ get_url(path='@/curated/_index.md') }}">Curated</a>
```

## Multi-Page Article Merging

- **containerd-design/**: README intro + sub-articles appended as `## Architecture`, `## Data Flow`, `## Lifecycle`, `## Mounts`, `## Snapshots`
- **runc-docs/**: README intro + sub-articles as `## Cgroup v2`, `## Checkpoint/Restore`, `## Deprecated`, `## Experimental`, `## Spec Conformance`, `## Systemd`, `## Terminals`
- **kubernetes-informers/**: `## Introduction` + `## Deep Dive` sections
- Chinese translations follow the same merge pattern

## Assets

All images, PDFs, and code files remain colocated in each article's directory. Zola serves page assets from the same directory automatically.
