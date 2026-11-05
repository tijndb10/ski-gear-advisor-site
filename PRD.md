# Product Requirements Document: Ski Gear Advisor

**Status:** Draft v1 · **Date:** 2026-11-05

## 1. Problem
Skiers, especially occasional and holiday skiers, don't know which skis and boots suit them. Gear shops are intimidating, reviews are written for experts, and specs (waist width, rocker, flex) are confusing. Many either rent blindly, buy the wrong gear, or put off buying.

## 2. Goal
Let a user describe their ski experience and leave the site with a **clear idea of what to buy before their holiday**: **3 ski recommendations** and **3 ski boot recommendations**, each with a plain-language reason.

### Success metrics
- ≥ 70% of users who start the questionnaire reach the results page.
- Questionnaire completed in under 2 minutes.
- ≥ 60% of users rate results "clear and useful" (one-click feedback on results page).
- Click-through to retailer or product pages from results (if affiliate links are added later).

## 3. Target users
| Persona | Description | Key need |
|---|---|---|
| Holiday beginner | 1–2 trips, rents gear, wants to buy | Forgiving, easy gear; budget guidance |
| Progressing intermediate | Skis a week or two per year, wants to improve | Gear that grows with them |
| Returning skier | Skied years ago, unsure what changed | Modern equivalents, simple explanation |
| Advanced/off-piste | Experienced, specific terrain preferences | Terrain-specific, performance gear |

## 4. User flow
1. **Landing page**: one-line value proposition, "Find my gear" button.
2. **Questionnaire** (one question per screen, progress bar, back button).
3. **Results page**: 3 skis + 3 boots, each with the reason it fits, key specs explained, and a price range.
4. **Next steps**: short "how to buy / fit tips" checklist, option to save or share results (email or link).

## 5. Questionnaire inputs
| Input | Options / type | Used for |
|---|---|---|
| Skill level | Beginner / Intermediate / Advanced / Expert | Ski flex, boot flex |
| Days skied per year | 1–7 / 8–20 / 20+ | Durability, price tier |
| Terrain preference | Groomed pistes / Mixed / Off-piste & powder / Park | Ski width and shape |
| Skiing style | Cautious / Balanced / Aggressive | Stiffness |
| Height, weight | Numbers (metric/imperial toggle) | Ski length, boot flex |
| Gender (optional) | Women / Men / Prefer not to say | Product line fit |
| Boot size and foot shape | EU/US size, narrow / medium / wide | Boot last width |
| Budget | Under €300 / €300–600 / €600–1000 / No limit | Price filtering |
| Destination (optional) | Region/country | Typical snow conditions |

## 6. Functional requirements
**Must have (MVP)**
- F1. Guided multi-step questionnaire with validation and progress indicator.
- F2. Recommendation engine: rule-based scoring against a product catalog, outputting exactly 3 skis and 3 boots, ranked, with a "why this fits you" explanation.
- F3. Results page with product name, brand, type, price range, key specs in plain language, and a "good for" tag.
- F4. Mini glossary and tooltips for jargon (flex, waist width, rocker, last).
- F5. Responsive design (mobile first, since users browse on the go).
- F6. "Start over" and "edit answers" without losing progress.

**Should have**
- F7. Share or save results via link or email.
- F8. Buying checklist ("get boots fitted in-store", "check binding DIN setting", etc.).
- F9. Retailer or affiliate links.

**Could have (later)**
- F10. Rent vs. buy advice.
- F11. Ski length and boot flex calculator as standalone tools.
- F12. Accounts and history; compare products side by side.
- F13. Dutch and other language versions.

## 7. Recommendation logic (MVP)
- Product catalog is a structured dataset (JSON/CSV) with attributes: type, level, terrain, waist width, flex, last width, price, season.
- Each product gets a score from weighted matching to the user's answers; hard filters (budget, size availability, gender line) are applied first.
- Top 3 per category are returned; where possible, offer variety (e.g. best fit, best value, step-up option).
- Every recommendation shows the matched reasons, so the logic is transparent.

## 8. Non-functional requirements
- **Usability:** clear layout, large tap targets, plain language, no jargon without explanation.
- **Performance:** results in under 1 second; page load under 3 seconds on mobile.
- **Accessibility:** WCAG 2.1 AA.
- **Privacy:** no account required; collect minimal data; GDPR-compliant cookie handling.
- **Content accuracy:** catalog reviewed and refreshed each season; disclaimer that recommendations are guidance, with in-store boot fitting advised.

## 9. Content and design direction
Clean, light, alpine-inspired look; high contrast; one primary action per screen; results presented as cards. Tone: friendly, expert but never condescending.

## 10. Proposed tech approach
Static front-end (HTML/CSS/JS or a lightweight framework such as React/Next.js) with the recommendation engine running client-side against a JSON catalog. No backend needed for MVP; easy to host on any static host.

## 11. Risks and open questions
- **Catalog data source:** build manually, use a retailer feed, or an affiliate API? (Affects accuracy and upkeep.)
- **Monetization:** affiliate links, ads, or none?
- **Liability/accuracy:** boots especially depend on professional fitting; the wording must reflect that.
- **Language:** English only at launch, or Dutch too?
- **Scope of catalog:** how many products are needed for credible variety (suggest ~30 skis, ~30 boots to start)?

## 12. Milestones
1. PRD approved.
2. Questionnaire and scoring rules defined; sample catalog built.
3. Design mockups (landing, questionnaire, results).
4. MVP build and internal testing with 5–10 real skiers.
5. Launch before the next ski season; iterate on feedback.
