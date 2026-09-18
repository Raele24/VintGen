---
name: vintgen
description: Analyzes photographs or notes of secondhand items (clothing, accessories, vintage garments, electronics) to generate search-optimized listings and fair secondary market valuations for marketplaces (such as Vinted, eBay, Depop, Subito, and Wallapop).
---

# VintGen AI Agent Skill

This skill turns any AI agent (Google Antigravity, GitHub Copilot CLI, Claude Code, or IDE agents) into an expert listing and valuation engine for secondhand online marketplaces (such as Vinted, eBay, Depop, Subito, and Wallapop).

## When to Use

Activate this skill when:
- The user provides photos, paths to images, or descriptions of clothing, vintage items, tech, or secondhand goods.
- The user asks to list an item, estimate fair resale price, or generate a structured marketplace listing.

## Workflow & Step-by-Step Instructions

1. **Input Inspection**:
   - Inspect photographs (item, labels, wash tags, fabric tags, packaging, flaws).
   - Read seller notes (brand, specs, flaws, inclusions, measurements).

2. **Attribute Extraction**:
   - **Brand**: Detect brand accurately.
   - **Model / SKU**: Identify exact style name, part number, or cut.
   - **Condition**: Standard secondhand states: `New with tags`, `New without tags`, `Very good`, `Good`, `Satisfactory`.
   - **Flaws**: Honestly document any visible wear, stains, or defects.

3. **Title Optimization**:
   - Limit to 65 characters for search visibility.
   - Pattern: `[Brand] [Exact Model / Style] - [Key Material / Color] - [Size]`

4. **Marketplace Pricing Engine (Realistic Seller Asking Strategy)**:
   - Calculate a realistic asking price representing what sellers actively list for on European secondary platforms (eBay, Subito, Vinted, Wallapop):
     - Adopt a seller listing perspective with healthy asking margins, NOT bottom-dollar liquidation rates.
     - 32GB (2x16GB) DDR4 RAM kits (Corsair Vengeance, G.Skill, Kingston): Benchmark at €115 - €145 asking price (€140 - €185 if brand new sealed).
     - 16GB DDR4: Benchmark at €45 - €60.
     - 500GB SSDs / M.2 SATA: Benchmark at €42 - €55 asking price. 1TB SSDs: €70 - €95.
     - Provide a recommended listing price along with a 15-20% floor and ceiling.
   - Construct clean 1-click live search links using clean Brand and Model (stripping condition and redundant terms):
     - eBay: `https://www.ebay.it/sch/i.html?_nkw=[Clean+Query]`
     - Vinted: `https://www.vinted.it/catalog?search_text=[Clean+Query]`
     - Subito: `https://www.subito.it/annunci-italia/vendita/usato/?q=[Clean+Query]`

5. **Output Format (Return Exclusively a Single Markdown Table)**:
   - Output MUST be strictly a single clean markdown table for immediate copying.
   - ZERO emojis, ZERO marketing buzzwords, ZERO prose essays.
   - Description must be a short telegraphic bulleted list (- ).

| Field | Detail |
| :--- | :--- |
| **Title** | [Brand] [Exact Model / Style] - [Key Material / Color] - [Size] (max 65 chars) |
| **Brand** | [Brand name] |
| **Model / Style** | [Exact model, cut, or style name] |
| **Condition** | [New with tags / New without tags / Very good / Good / Satisfactory] |
| **Category** | [General marketplace category, e.g. Men > Clothing > Jackets] |
| **Specs** | [Key specs or materials, e.g. 100% Virgin Wool, Size L, Made in Italy] |
| **Market Search Links** | [eBay Live Search](https://www.ebay.it/sch/i.html?_nkw=[Encoded+Query]) \| [Vinted Live Search](https://www.vinted.it/catalog?search_text=[Encoded+Query]) \| [Subito Live Search](https://www.subito.it/annunci-italia/vendita/usato/?q=[Encoded+Query]) |
| **Price** | EUR [Recommended Price] (Floor: EUR [Floor Price], Ceiling: EUR [Ceiling Price]) |
| **Description** | - [Brand] [Style] [Core specs]<br>- Composition: [Materials]<br>- Size: [Labeled size and fit]<br>- Condition: [Actual state]<br>- Details: [Provenance or notable features]<br>- Flaws: [Disclosed flaws, or 'None'] |
| **Hashtags** | [8-10 targeted hashtags: #brand #model #spec #category ...] |
