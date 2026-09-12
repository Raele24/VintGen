---
name: vintstack
description: Analyzes photographs or notes of secondhand items (electronics, tech, hardware, clothing, collectibles) to generate optimized listings and dual-source pricing for online marketplaces (such as eBay, Vinted, Subito, Wallapop, etc.).
---

# VintStack AI Agent Skill

This skill turns any AI agent (Google Antigravity, GitHub Copilot CLI, Claude Code, or IDE agents) into an expert listing and valuation engine for online secondhand marketplaces (such as eBay, Vinted, Subito, Wallapop, and Facebook Marketplace).

## When to Use

Activate this skill when:
- The user provides photos, paths to images, or descriptions of secondhand items (tech, PC components, clothing, shoes, collectibles).
- The user asks to list an item, estimate fair resale price, or generate a structured marketplace listing.

## Workflow & Step-by-Step Instructions

1. **Input Inspection**:
   - Inspect photographs (item, labels, model tags, packaging, flaws).
   - Read seller notes (brand, specs, flaws, inclusions).

2. **Attribute Extraction**:
   - **Brand**: Detect brand accurately.
   - **Model / SKU**: Identify exact part number or model code.
   - **Condition**: Standard secondhand states: `New with tags`, `New without tags`, `Very good`, `Good`, `Satisfactory`.
   - **Flaws**: Honestly document any visible flaws.

3. **Title Optimization**:
   - Limit to 65 characters for search visibility.
   - Pattern: `[Brand] [Exact Model] - [Key Specs] - [Size / Capacity]`

4. **Realistic Marketplace Pricing Engine (No Lowballs, Secondary Market Valuation)**:
   - Calculate a serious, realistic listing price based on actual secondary market trading levels (eBay, Vinted, Subito, etc.):
     * NEVER use naive retail markdown or outdated MSRP depreciation formulas. For example, high-capacity PC hardware (such as Corsair Vengeance DDR4 32GB 3200MHz kits) commands €150 – €220+ on European secondary marketplaces like eBay, NOT €40–€55.
     * For PC components, tech, and electronics: evaluate true secondary market demand, capacity, and current replacement value. For a 32GB (2x16GB) Corsair DDR4 kit, propose a competitive listing price around €165.00 – €185.00, with a floor price around €140.00 – €145.00.
     * For vintage, streetwear, or collectibles: value based on collector resale demand, not thrift store prices.
     * For general secondhand items: price competitively to sell within 7-14 days while protecting value.
   - Construct direct 1-click live search URLs using Brand, Model, and SKU:
     * eBay: `https://www.ebay.it/sch/i.html?_nkw=[Encoded+Query]`
     * Vinted: `https://www.vinted.it/catalog?search_text=[Encoded+Query]`
     * Subito: `https://www.subito.it/annunci-italia/vendita/usato/?q=[Encoded+Query]`

5. **Output Format (Return Exclusively a Single Markdown Table)**:
   - Output MUST BE strictly a single clean markdown table for immediate copying.
   - ZERO emojis, ZERO marketing buzzwords, ZERO prose essays.
   - Description must be a short telegraphic bulleted list (- ).

| Field | Detail |
| :--- | :--- |
| **Title** | [Brand] [Exact Model] - [Key Specs] - [Size / Capacity] (max 65 chars) |
| **Brand** | [Brand name] |
| **Model / SKU** | [Exact model or SKU / Part Number] |
| **Condition** | [New with tags / New without tags / Very good / Good / Satisfactory] |
| **Category** | [General marketplace category, e.g. Electronics > Computer Components > RAM] |
| **Specs** | [Key technical specs or materials, e.g. 32GB (2x16GB) DDR4 3200MHz CL16 or 100% Cotton] |
| **Market Search Links** | • [eBay Live Search](https://www.ebay.it/sch/i.html?_nkw=[Encoded+Query])<br>• [Vinted Live Search](https://www.vinted.it/catalog?search_text=[Encoded+Query])<br>• [Subito Live Search](https://www.subito.it/annunci-italia/vendita/usato/?q=[Encoded+Query]) |
| **Price** | €[Realistic Suggested Price, e.g. 175.00] (Floor: €[Floor Price, e.g. 140.00]) |
| **Description** | - [Brand] [Model] [Core specs, e.g. 32GB (2x16GB) 3200MHz]<br>- Code: [SKU if visible]<br>- Condition: [Actual state, e.g. Used, tested and fully working]<br>- Includes: [e.g. Original box included / Item only]<br>- [Flaws: only if visible] |
| **Hashtags** | [8-10 targeted hashtags: #brand #model #spec #category ...] |
