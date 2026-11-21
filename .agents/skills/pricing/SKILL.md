---
name: pricing
description: "Unit-economics modeling, LLM token/compute margin calculation, usage-based rate card design, and SaaS tier packaging for AI-powered software."
version: "1.0.0"
source: "https://github.com/coreyhaines31/marketingskills"
license: "MIT"
category: "seo-growth"
tier: "optional-growth"
platforms: [antigravity, copilot, claude-code, codex, gemini-cli]
requires_tools: [read_file, write_file]
dependencies: []
security_scope: "workspace-write"
---

# Pricing — AI Unit Economics & Tier Modeling Skill

## 1. Purpose
Calculate accurate COGS (Cost of Goods Sold) for LLM/agent workloads and design sustainable pricing tiers, quotas, and rate limits for commercial AI applications.

## 2. Unit Economics Formula
For every AI workflow feature, compute:
$$\text{Cost per Run} = \left(N_{\text{in}} \times P_{\text{in}} + N_{\text{out}} \times P_{\text{out}}\right) \times M_{\text{retry}} + C_{\text{sandbox/infra}}$$
where $M_{\text{retry}} \in [1.2, 1.3]$ accounts for retries/validation and multi-agent multiplier ($3\times$–$15\times$ baseline chat).

## 3. Deliverables
- **Cost & Margin Table:** Baseline (p50) and heavy-usage (p95/p99) cost per user/run across model tiers (`flash-lite`, `flash`, `pro`).
- **Quota & Rate-Limit Specification:** Hard caps preventing runaway token spend on free/starter tiers.

## 4. Validation Criteria
- Every proposed tier includes explicit p50/p95 COGS calculations, gross margin percentage, and hard quota enforcement rules.
