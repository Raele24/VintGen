---
name: seo-audit
description: "Technical SEO inspection covering crawlability, canonical tags, XML sitemaps, schema.org JSON-LD, meta tags, and Core Web Vitals for public web sites."
version: "1.0.0"
source: "https://github.com/coreyhaines31/marketingskills"
license: "MIT"
category: "seo-growth"
tier: "optional-growth"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [read_file, invoke_subagent, run_command]
dependencies: []
security_scope: "network-external"
---

# SEO Audit — Technical Search Engine Optimization Skill

## 1. Purpose
Audit public-facing web applications, documentation portals, and landing pages for technical search engine discoverability and indexing health. Isolated in `optional/growth-media/`.

## 2. Audit Checklist
1. **Crawlability & Indexing:** Verify `robots.txt`, XML sitemap validity, HTTP status codes, and absence of unintended `noindex` directives.
2. **Document Metadata:** Unique `<title>` (50–60 chars), `<meta name="description">` (120–158 chars), `<link rel="canonical">`, and OpenGraph/Twitter Card tags on every route.
3. **Heading & Semantic Structure:** Exactly one `<h1>` per page with logical `<h2>`–`<h4>` hierarchy.
4. **Structured Data:** Valid `application/ld+json` (`Schema.org`) markup for `SoftwareApplication`, `TechArticle`, or `FAQPage`.
5. **Performance (Core Web Vitals):** LCP $< 2.5\text{s}$, CLS $< 0.1$, INP $< 200\text{ms}$.

## 3. Validation Criteria
- Produces a structured markdown audit report classifying issues into `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW` with exact file/route remediation steps.
