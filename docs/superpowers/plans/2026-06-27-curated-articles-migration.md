# Curated Articles Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate 18 curated technical articles from `yshngg/` into the Zola website under `/curated/`, organized into 5 category taxonomies, with bilingual support.

**Architecture:** Each article gets its own directory under `content/curated/` with `index.md` (+ optional `index.zh.md`). Multi-page articles are merged into single files. Assets (images, PDFs, C files) remain colocated. Custom templates group articles by category on the listing page and show author/original source on article pages.

**Tech Stack:** Zola (Tera templates), standard markdown

## Global Constraints

- Zola TOML front matter (`+++`) for all articles
- `[extra]` section for `author` and `original_url`
- `[taxonomies]` section for `category`
- Chinese translations use Zola's multilingual `index.zh.md` naming
- Multi-page articles merged into single `index.md` with `##` section headings
- All relative image/asset paths preserved (same directory as markdown)
- No dates shown for curated articles; sorted by `weight` within categories
- 5 taxonomies: Go, Kubernetes, Containers, Systems, Observability

---
## File Structure Map

```
content/curated/
├── _index.md              # sort_by = "none"
├── _index.zh.md
├── almighty-pause-container/   # weight: 30, Containers, bilingual
│   ├── index.md + index.zh.md + pause-container.png, x-tweet-screenshot.png, zombie.png
├── containerd-design/          # weight: 31, Containers, bilingual, merged from 5 sub-articles
│   ├── index.md + index.zh.md + architecture.png, data-flow.png, snapshot_model.png
├── flight-recorder/            # weight: 10, Go, bilingual
│   ├── index.md + index.zh.md + flight_recorder_{1..5}.png
├── go-in-production/           # weight: 11, Go, EN only
│   └── index.md
├── go-names-talk/              # weight: 12, Go, EN only
│   └── index.md
├── go-practical-openapi/       # weight: 13, Go, EN only
│   ├── index.md + api-lifecycle.png, swagger-ui-screenshot.png
├── greenteagc/                 # weight: 14, Go, bilingual, ~84 images
│   ├── index.md + index.zh.md + greenteagc/{84 PNGs + 1 SVG}
├── kubernetes-controllers/     # weight: 20, Kubernetes, EN only
│   └── index.md
├── kubernetes-informers/       # weight: 21, Kubernetes, EN only, merged from 2 sub-articles
│   ├── index.md + kubediff.png, client-go-controller-interaction.png
├── kubernetes-leader-election/ # weight: 22, Kubernetes, EN only
│   └── index.md
├── kubernetes-operators/       # weight: 23, Kubernetes, EN only
│   ├── index.md + example-1a.svg, example-1b.svg, example-2.svg
├── lxc-vs-docker/              # weight: 32, Containers, bilingual
│   ├── index.md + index.zh.md + {3 images}
├── memory-layout/              # weight: 40, Systems, EN only
│   ├── index.md + {6 .c files}
├── node-problem-detector-v0/   # weight: 24, Kubernetes, EN only
│   ├── index.md + system-diagram.png, logmonitor-architecture.png
├── prometheus-agent-mode-introduction/  # weight: 50, Observability, bilingual
│   ├── index.md + index.zh.md + prom.png, prom-remote.png, agent.png, yoda.webp
└── runc-docs/                  # weight: 33, Containers, bilingual, merged from 7 sub-articles
    ├── index.md + index.zh.md + Security-Audit.pdf
```

---
### Task 1: Zola Config, Templates, and Navigation

**Files:**
- Modify: `zola.toml`
- Create: `templates/curated.html`
- Create: `templates/curated-page.html`
- Modify: `templates/base.html`

**Interfaces:**
- Consumes: existing Zola project structure, existing `templates/base.html`, `templates/post.html` as reference
- Produces: taxonomy config, two new templates, nav link for `/curated/`

- [ ] **Step 1: Add taxonomies to zola.toml**

Insert after line 28 (`[extra]` section):

```toml
[taxonomies]
category = { feed = true }
```

- [ ] **Step 2: Create curated listing template**

Write to `templates/curated.html`:

```jinja2
{% extends "base.html" %} {% block content %}
<h1 class="title">{{ section.title }}</h1>

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

- [ ] **Step 3: Create curated article page template**

Write to `templates/curated-page.html`:

```jinja2
{% extends "base.html" %} {% block content %}
<h1 class="title">{{ page.title }}</h1>

{% if page.extra.author %}
<p class="subtitle"><strong>By {{ page.extra.author }}</strong>
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
            {% if h2.children %}
            <ul>
              {% for h3 in h2.children %}
              <li class="toc-item depth-3">
                <a href="{{ h3.permalink | safe }}">{{ h3.title }}</a>
              </li>
              {% endfor %}
            </ul>
            {% endif %}
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

- [ ] **Step 4: Add Curated nav link to base.html**

Edit `templates/base.html` line 35 (after the Blog link):

Old:
```html
<a href="{{ get_url(path='@/blog/_index.md') }}">Blog</a>
```

New:
```html
<a href="{{ get_url(path='@/blog/_index.md') }}">Blog</a>
<span>/</span>
<a href="{{ get_url(path='@/curated/_index.md') }}">Curated</a>
```

- [ ] **Step 5: Verify config compiles**

Run: `zola check`
Expected: No errors (may warn about missing content/curated section — that's fine)

---

### Task 2: Section _index.md Files

**Files:**
- Create: `content/curated/_index.md`
- Create: `content/curated/_index.zh.md`

- [ ] **Step 1: Create English section index**

Write to `content/curated/_index.md`:

```toml
+++
title = "Curated Articles"
template = "curated.html"
page_template = "curated-page.html"
sort_by = "none"
+++
```

- [ ] **Step 2: Create Chinese section index**

Write to `content/curated/_index.zh.md`:

```toml
+++
title = "精选文章"
template = "curated.html"
page_template = "curated-page.html"
sort_by = "none"
+++
```

- [ ] **Step 3: Verify**

Run: `zola check`
Expected: No errors

---

### Task 3: Migrate Go Articles (5 articles)

**Files (create):**
- `content/curated/flight-recorder/index.md` + `index.zh.md`
- `content/curated/go-in-production/index.md`
- `content/curated/go-names-talk/index.md`
- `content/curated/go-practical-openapi/index.md`
- `content/curated/greenteagc/index.md` + `index.zh.md`

**Assets (copy):** All PNGs from each source `yshngg/<name>/` directory, including the greenteagc/greenteagc/ subdirectory with ~84 images

- [ ] **Step 1: Migrate flight-recorder**

Source: `yshngg/flight-recorder/README.md` (EN, 240 lines) + `README_zh-CN.md` (ZH, 238 lines)
Title from h1: "Flight Recorder in Go 1.25". Author from subtitle: "Carlos Amedee and Michael Knyszek".
Images: `flight_recorder_1.png` through `flight_recorder_5.png`
Slug: `flight-recorder`

Create `content/curated/flight-recorder/` and copy all 5 PNGs.

Write `content/curated/flight-recorder/index.md`:

```toml
+++
title = "Flight Recorder in Go 1.25"
weight = 10

[extra]
author = "Carlos Amedee, Michael Knyszek"

[taxonomies]
category = ["Go"]
+++
```

Append full content from `yshngg/flight-recorder/README.md` after the `+++` (preserve all markdown, images remain as relative paths).

Write `content/curated/flight-recorder/index.zh.md`:

```toml
+++
title = "Go 运行时飞行记录器"
weight = 10

[extra]
author = "The Go Team"

[taxonomies]
category = ["Go"]
+++
```

Append full content from `yshngg/flight-recorder/README_zh-CN.md` after the `+++`.

- [ ] **Step 2: Migrate go-in-production**

Source: `yshngg/go-in-production/README.md`
No images.
No front matter in source. Title from `# Go: Best Practices for Production Environments` h1.

Create `content/curated/go-in-production/` and write `index.md`:

```toml
+++
title = "Go: Best Practices for Production Environments"
weight = 11

[extra]
author = "Peter Bourgon"
original_url = "https://github.com/gophercon/2014-talks"

[taxonomies]
category = ["Go"]
+++
```

Append full content from `yshngg/go-in-production/README.md` after `+++`. Remove the `# Go: Best Practices...` h1 and `_**Authors:** Peter Bourgon_` line (title is in front matter now).

- [ ] **Step 3: Migrate go-names-talk**

Source: `yshngg/go-names-talk/README.md` (244 lines)
Title from h1: "What's in a name? (Go Names Talk 2014)". Author from subtitle: "Andrew Gerrand".
No images.

Create `content/curated/go-names-talk/index.md`:

```toml
+++
title = "What's in a name? (Go Names Talk 2014)"
weight = 12

[extra]
author = "Andrew Gerrand"

[taxonomies]
category = ["Go"]
+++
```

Append content from source, stripping the h1 and author line.

- [ ] **Step 4: Migrate go-practical-openapi**

Source: `yshngg/go-practical-openapi/README.md`
Has existing YAML front matter: title, author, date, url.
Images: `api-lifecycle.png`, `swagger-ui-screenshot.png`

Create `content/curated/go-practical-openapi/` and copy images.

Write `index.md`:

```toml
+++
title = "Practical OpenAPI in Go"
weight = 13

[extra]
author = "Alex Pliutau"
original_url = "https://packagemain.tech/p/practical-openapi-in-golang"

[taxonomies]
category = ["Go"]
+++
```

Append content from `yshngg/go-practical-openapi/README.md` after `+++`, stripping the old YAML front matter and the `# Practical OpenAPI in Go` h1. Original URL: `https://packagemain.tech/p/practical-openapi-in-golang`

- [ ] **Step 5: Migrate greenteagc**

Source: `yshngg/greenteagc/README.md` (1166 lines, complex HTML/CSS/JS carousel)
Source: `yshngg/greenteagc/README_zh-CN.md` (1060 lines)
Images: `yshngg/greenteagc/greenteagc/` (~84 PNGs + 1 SVG)

Create `content/curated/greenteagc/` and copy all images (entire `greenteagc/` subdirectory).

Write `index.md`:

```toml
+++
title = "The Green Tea Garbage Collector"
weight = 14
description = "Go 1.25 includes a new experimental garbage collector, Green Tea."

[extra]
author = "Michael Knyszek, Austin Clements"

[taxonomies]
category = ["Go"]
tags = ["garbage collection", "performance"]
+++
```

Append content from `yshngg/greenteagc/README.md` after `+++`, stripping the old YAML front matter and the `# The Green Tea Garbage Collector` h1.

Write `index.zh.md`:

```toml
+++
title = "The Green Tea Garbage Collector"
weight = 14

[extra]
author = "Michael Knyszek, Austin Clements"

[taxonomies]
category = ["Go"]
tags = ["garbage collection", "performance"]
+++
```

- [ ] **Step 6: Verify Go articles**

Run: `zola check`
Expected: No errors

---

### Task 4: Migrate Kubernetes Articles (5 articles)

**Files (create):**
- `content/curated/kubernetes-controllers/index.md`
- `content/curated/kubernetes-informers/index.md` (merged from 2 sub-articles)
- `content/curated/kubernetes-leader-election/index.md`
- `content/curated/kubernetes-operators/index.md`
- `content/curated/node-problem-detector-v0/index.md`

- [ ] **Step 1: Migrate kubernetes-controllers**

Source: `yshngg/kubernetes-controllers/README.md` (497 lines)
Title from h1: "So you wanna write Kubernetes controllers?". Author from about section: "Ahmet Alp Balkan".
No images.

Create `content/curated/kubernetes-controllers/` and write `index.md`:

```toml
+++
title = "So you wanna write Kubernetes controllers?"
weight = 20

[extra]
author = "Ahmet Alp Balkan"

[taxonomies]
category = ["Kubernetes"]
+++
```

- [ ] **Step 2: Migrate kubernetes-informers (merged)**

Source: `yshngg/kubernetes-informers/introduction/README.md` (has YAML front matter: title, author, date, link, 142 lines) + `yshngg/kubernetes-informers/deep-dive/README.md` (no front matter, 74 lines, author "Farhan")
Images: `kubediff.png`, `client-go-controller-interaction.png`

Create `content/curated/kubernetes-informers/` and copy images.

Write `index.md`:

```toml
+++
title = "Kubernetes Informers: Introduction and Deep Dive"
weight = 21

[extra]
author = "Mario Macías Lloret, Farhan"
original_url = "https://macias.info/entry/202109081800_k8s_informers.md"

[taxonomies]
category = ["Kubernetes"]
+++
```

Content: Introduction article as-is (strip YAML front matter and h1), blank line, then `## Deep Dive` heading, blank line, then deep-dive content (strip its h1, preserve image references `kubediff.png` and `client-go-controller-interaction.png`).

Remove the `_By Farhan - October 03, 2021_` line from the deep-dive content.

- [ ] **Step 3: Migrate kubernetes-leader-election**

Source: `yshngg/kubernetes-leader-election/README.md` (208 lines)
Title from h1: "How to add Kubernetes-powered leader election to your Go apps". No author listed.
No images.

Create `content/curated/kubernetes-leader-election/` and write `index.md`:

```toml
+++
title = "How to add Kubernetes-powered leader election to your Go apps"
weight = 22

[taxonomies]
category = ["Kubernetes"]
+++
```

Append content from source, stripping the h1 and the "2024-07-19" date line.

- [ ] **Step 4: Migrate kubernetes-operators**

Source: `yshngg/kubernetes-operators/README.md` (108 lines)
Has YAML front matter: title="Introducing Operators: Putting Operational Knowledge into Software", author="Brandon Philips", date=2016-11-03, link="https://web.archive.org/web/20170129131616/https://coreos.com/blog/introducing-operators.html"
Images: `example-1a.svg`, `example-1b.svg`, `example-2.svg`

Create `content/curated/kubernetes-operators/` and copy SVGs.

Write `index.md`:

```toml
+++
title = "Introducing Operators: Putting Operational Knowledge into Software"
weight = 23

[extra]
author = "Brandon Philips"
original_url = "https://web.archive.org/web/20170129131616/https://coreos.com/blog/introducing-operators.html"

[taxonomies]
category = ["Kubernetes"]
+++
```

Append content from source, stripping YAML front matter and h1.

- [ ] **Step 5: Migrate node-problem-detector-v0**

Source: `yshngg/node-problem-detector-v0/README.md` (419 lines, design doc)
Title from h1: "Node Problem Detector". Author: "lantaol@google.com".
Images: `system-diagram.png`, `logmonitor-architecture.png`

Create `content/curated/node-problem-detector-v0/` and copy images.

Write `index.md`:

```toml
+++
title = "Node Problem Detector"
weight = 24

[extra]
author = "lantaol@google.com"

[taxonomies]
category = ["Kubernetes"]
+++
```

Append content from source, stripping the h1, "Status: Draft", and author/date lines.

- [ ] **Step 6: Verify Kubernetes articles**

Run: `zola check`
Expected: No errors

---

### Task 5: Migrate Containers Articles (4 articles)

**Files (create):**
- `content/curated/almighty-pause-container/index.md` + `index.zh.md`
- `content/curated/containerd-design/index.md` + `index.zh.md` (merged)
- `content/curated/lxc-vs-docker/index.md` + `index.zh.md`
- `content/curated/runc-docs/index.md` + `index.zh.md` (merged)

- [ ] **Step 1: Migrate almighty-pause-container**

Source: `yshngg/almighty-pause-container/README.md` (has YAML front matter: Title, Author, Date, Link)
Source: `yshngg/almighty-pause-container/README_zh-CN.md` (Chinese, no front matter)
Images: `pause-container.png`, `x-tweet-screenshot.png`, `zombie.png`

Create `content/curated/almighty-pause-container/` and copy all 3 images.

Write `index.md`:

```toml
+++
title = "The Almighty Pause Container"
weight = 30

[extra]
author = "Ian Lewis"
original_url = "https://www.ianlewis.org/en/almighty-pause-container"

[taxonomies]
category = ["Containers"]
+++
```

Append content from source README after `+++`, stripping:
- Old YAML front matter (lines 1-6)
- The `<details>` language selector block (lines 8-14)
- The `# The Almighty Pause Container` h1 (line 16)

Write `index.zh.md`:

```toml
+++
title = "全能的 pause 容器"
weight = 30

[extra]
author = "Ian Lewis"
original_url = "https://www.ianlewis.org/en/almighty-pause-container"

[taxonomies]
category = ["Containers"]
+++
```

Append content from `README_zh-CN.md` after `+++`, stripping the `# 全能的 pause 容器` h1.

- [ ] **Step 2: Migrate lxc-vs-docker**

Source: `yshngg/lxc-vs-docker/README.md` (has PascalCase YAML front matter)
Source: `yshngg/lxc-vs-docker/README_zh-CN.md`
Images: 3 PNG files

Copy to `content/curated/lxc-vs-docker/` with images.

Front matter pattern same as almighty-pause-container. Weight: 32.

- [ ] **Step 3: Migrate containerd-design (merged)**

Source: `yshngg/containerd-design/README.md` (TOC) + 5 sub-articles + Chinese counterparts

Create `content/curated/containerd-design/` and copy images: `architecture.png`, `data-flow.png`, `snapshot_model.png`

Read each sub-article:
- `architecture.md` + `architecture_zh-CN.md`
- `data-flow.md` + `data-flow_zh-CN.md`
- `container-lifecycle.md` + `container-lifecycle_zh-CN.md`
- `snapshots.md` + `snapshots_zh-CN.md`
- `mounts.md` + `mounts_zh-CN.md`

Write `index.md`:

```toml
+++
title = "containerd Design"
weight = 31

[taxonomies]
category = ["Containers"]
+++
```

Content: README intro text (brief) + `## Architecture` + architecture content + `## Data Flow` + data-flow content + `## Container Lifecycle` + lifecycle content + `## Snapshots` + snapshots content + `## Mounts` + mounts content.

Write `index.zh.md`: Same structure but with Chinese sub-article content.

- [ ] **Step 4: Migrate runc-docs (merged)**

Source: `yshngg/runc-docs/README.md` (TOC) + 7 sub-articles + Chinese counterparts

Create `content/curated/runc-docs/` and copy `Security-Audit.pdf`.

Read each sub-article:
- `spec-conformance.md` + `spec-conformance_zh-CN.md`
- `cgroup-v2.md` + `cgroup-v2_zh-CN.md`
- `checkpoint-restore.md` + `checkpoint-restore_zh-CN.md`
- `systemd.md` + `systemd_zh-CN.md`
- `terminals.md` + `terminals_zh-CN.md`
- `experimental.md` + `experimental_zh-CN.md`
- `deprecated.md` + `deprecated_zh-CN.md`

Write `index.md`:

```toml
+++
title = "runc Documentation"
weight = 33

[taxonomies]
category = ["Containers"]
+++
```

Content: README intro + `## Spec Conformance` + spec-conformance content + `## Cgroup v2` + cgroup-v2 content + `## Checkpoint and Restore` + checkpoint-restore content + `## systemd cgroup driver` + systemd content + `## Terminals and Standard IO` + terminals content + `## Experimental Features` + experimental content + `## Deprecated Features` + deprecated content.

Write `index.zh.md`: Same structure with Chinese sub-article content.

- [ ] **Step 5: Verify Containers articles**

Run: `zola check`
Expected: No errors

---

### Task 6: Migrate Systems + Observability Articles (2 articles)

**Files (create):**
- `content/curated/memory-layout/index.md`
- `content/curated/prometheus-agent-mode-introduction/index.md` + `index.zh.md`

- [ ] **Step 1: Migrate memory-layout**

Source: `yshngg/memory-layout/README.md` (143 lines)
No front matter.
Code files: `heap_segment.c`, `initialized_data_segment.c`, `practical_example.c`, `stack_segment.c`, `uninitialized_data_segment.c`, `verify_memory_layout.c`

Create `content/curated/memory-layout/` and copy all 6 `.c` files.

Write `index.md`:

```toml
+++
title = "Memory Layout of C Programs"
weight = 40

[extra]
author = "GeeksforGeeks"
original_url = "https://www.geeksforgeeks.org/c/memory-layout-of-c-program/"

[taxonomies]
category = ["Systems"]
+++
```

Append content from source, stripping the h1 and "Link: ..." line.

- [ ] **Step 2: Migrate prometheus-agent-mode-introduction**

Source: `yshngg/prometheus-agent-mode-introduction/README.md` (179 lines)
Source: `yshngg/prometheus-agent-mode-introduction/README_zh-CN.md` (179 lines)
No front matter.
Images: `prom.png`, `prom-remote.png`, `agent.png`, `yoda.webp`

Create `content/curated/prometheus-agent-mode-introduction/` and copy all 4 images.

Write `index.md`:

```toml
+++
title = "Introducing Prometheus Agent Mode"
weight = 50

[extra]
author = "Bartlomiej Plotka"
original_url = "https://prometheus.io/blog/2021/11/16/agent-mode/"

[taxonomies]
category = ["Observability"]
+++
```

Append content from source README, stripping:
- The `<details>` language selector block (lines 5-11)
- The `# Introducing Prometheus Agent Mode...` h1 (line 1)
- The "November 16, 2021 by Bartlomiej Plotka" attribution line (line 3)
- The author bio block quote (line 13)

Write `index.zh.md`:

```toml
+++
title = "Prometheus Agent 模式介绍"
weight = 50

[extra]
author = "Bartlomiej Plotka"
original_url = "https://prometheus.io/blog/2021/11/16/agent-mode/"

[taxonomies]
category = ["Observability"]
+++
```

- [ ] **Step 3: Verify Systems + Observability articles**

Run: `zola check`
Expected: No errors

---

### Task 7: Full Build Verification

- [ ] **Step 1: Run full build**

Run: `zola build`
Expected: Site builds successfully to `public/`

- [ ] **Step 2: Verify key pages**

Check that the following paths return 200:
- `/curated/`
- `/curated/almighty-pause-container/`
- `/curated/go-in-production/`
- `/curated/containerd-design/`
- `/curated/greenteagc/`

- [ ] **Step 3: Run development server for visual check**

Run: `zola serve` and verify the curated section renders correctly with category groupings on the listing page and author/source on article pages.
