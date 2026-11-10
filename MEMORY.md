# Project Memory: Ski Gear Advisor

## Project summary
Website where skiers describe their experience and get 3 ski and 3 ski boot recommendations, so they know what to buy before a holiday. Must be user friendly with a clear layout. (Source: CLAUDE.md)

## Progress log
- **2026-11-05**: First session. MEMORY.md was empty. Wrote [PRD.md](PRD.md) (v1 draft): problem, goal, personas, user flow, questionnaire inputs, functional requirements (MVP / should / could), rule-based recommendation logic, non-functional requirements, risks, milestones.

- **2026-11-05**: Built sample catalog at [data/catalog.json](data/catalog.json): 30 skis + 30 boots. Data is **invented placeholder** (fictional models, flagged in `_note`), not real products. Verified every level (1-4) x gender combo has >=4 skis and >=4 boots, so a top-3 is always possible.

- **2026-11-05**: Wrote the scoring engine [src/engine.js](src/engine.js) (plain JS, browser global `SkiEngine`, also CommonJS) and tests [tests/engine.test.js](tests/engine.test.js). Run with `bash tests/run.sh` (uses macOS `osascript -l JavaScript`, no Node needed). Status: 3522 checks, 0 failures, including all 144 level x terrain x gender x foot-width combos returning 3 skis + 3 boots.

- **2026-11-05**: Built the website UI (static, no build step): [index.html](index.html), [css/styles.css](css/styles.css), [js/app.js](js/app.js). Landing page -> 8 one-per-screen questions (progress bar, Back keeps answers, validation messages, metric/imperial toggle, EU shoe size -> mondopoint) -> results (3 skis + 3 boots as cards with reasons, plain-language specs, match %, buying checklist, glossary). "Copy link" encodes answers in the URL hash (`#r=`), so a shared link reopens the results. Tested end to end in the browser pane at desktop and 375px width: no console errors, no horizontal scroll.
- Open `index.html` directly in a browser to use it (works from file://). `data/catalog.js` is GENERATED from `data/catalog.json`; after editing the JSON run `bash scripts/build-catalog.sh`.
- Added 3 boots (catalog now 30 skis + 33 boots) to fill gaps found while testing.

## Learnings from the UI build
- Browser testing exposed an engine flaw the unit tests missed: a wide-footed expert got a 96 mm narrow race boot as top pick. Fix: boot last width is now a hard filter (no more than 2 mm narrower or 5 mm roomier than the foot) unless the engine widens the search and says so. Tests assert it. After adding 3 boots, no level/gender/width combo needs widening.
- Lesson: check real outputs in the UI, not just passing tests.
- The Claude preview server cannot read `~/Documents` (macOS permissions), so I tested by serving a copy from the scratchpad folder with `ruby -run -e httpd`.
- Not built / limits: no user feedback widget (needs a backend), no saved accounts, Dutch language, retailer links. EU shoe sizes only (hint given for US sizes). Boot sizes above EU ~46 for women fall outside catalog ranges and return fewer results (UI shows "No boots found").

- **2026-11-05**: GitHub hosting. User wants the code on GitHub and is new to git. Command Line Tools/git installed; I ran `git init` (branch `main`), added `.gitignore`, and made the first local commit. NOT pushed yet: the user must create the GitHub repo and sign in themselves (I never enter credentials). Recommended path for them: GitHub Desktop -> Add Local Repository -> Publish (keep private while data is placeholder). Optional: GitHub Pages (Settings -> Pages -> main / root) for a free live site.

- **2026-11-07**: Site is LIVE. Code published via GitHub Desktop to `tijndb10/ski-gear-advisor-site` (now **public**, needed for free GitHub Pages). Pages serves branch `main` / root at https://tijndb10.github.io/ski-gear-advisor-site/ . Confirmed working by the user. The first web upload (flat files, no folders) was in `tijndb10/ski-gear-advisor`; it is obsolete and can be deleted (Settings -> Danger Zone).
- Update workflow: edit files here -> in GitHub Desktop review under Changes, Commit to main, then Push origin -> live site updates in ~1 minute. Remember to run `bash scripts/build-catalog.sh` after editing data/catalog.json.
- Caveats: the repo is public, so CLAUDE.md, MEMORY.md and PRD.md are visible; the live site shows invented demo products (banner says so). The Claude session had no GitHub connector, so all GitHub steps were done by the user.

- **2026-11-07**: Visual redesign, "cinematic alpine" (user's choice; whole site; inspiration from awwwards.com / motionsites.ai taken as ideas only, nothing copied). Awwwards = gallery; MotionSites = paid AI-builder prompts behind a signup (not purchased). No photos/video, so the scene is built in code: fixed dawn-sky gradient + glowing sun, 3 SVG mountain ridges with parallax (mouse + scroll), drifting mist, falling-snow canvas ([js/scene.js](js/scene.js)). Content sits in frosted dark "sheets"; product cards are solid white; big bold type with a gradient accent; staggered entrance animations, animated match bars, hover/press states. Files changed: index.html, css/styles.css, new js/scene.js. app.js and the engine are untouched, so the 3932 engine checks still pass.
- Accessibility kept: focus rings, AA contrast checked on text over the scene (lead text brightened + shadow), `prefers-reduced-motion` disables all animation and snow, no horizontal scroll at 375px.
- Design decisions: system font stack (no Google Fonts, to avoid third-party requests/GDPR concerns); no external images. Parallax ridges only sink on scroll (lifting them exposed the sky).
- Testing note: in the Claude browser pane, CSS animations stay at time 0 while the pane is not displayed (no frames), so content looks invisible; it is a test artifact and settles once frames render.
- Not yet pushed: redesign is local until committed and pushed with GitHub Desktop.

## Scoring engine design
- Input: level 1-4, terrain, style, height, weight, gender (m/w/x), boot size (mondopoint), foot width, days per year, budgetMax (EUR **per item**, null = none). Validated; bad input throws.
- Hard filters: gender line, level range, budget, boot size range. If fewer than 3 remain, filters relax in 5 steps (budget +20%, level +-1, budget +50% & any gender line, then very wide) and a plain-language `notes` message is returned so the UI can tell the user.
- Ski score (100): terrain 40, level 20, stiffness vs target 20, waist width vs terrain 10, length 10. Ski length is computed from height (minus 15/10/5/0 cm by level, +5 off-piste, -5 park, +-3 for weight).
- Boot score (95, shown as %): flex vs target 40 (by level, gender, weight, style), last width vs foot 30 (boot too narrow penalised 2x more than too roomy), level 15, terrain/walk-mode 10.
- Picks: Best match, then Best value (>=5% cheaper, within 20 points), then Step up (stiffer, within 25 points). If no product truly qualifies, the slot is filled with "Also a strong match" so labels are never misleading.
- `daysPerYear` is validated but not scored yet (candidate: favour durability for 20+ days, price for low use).

## Learnings
- Sample outputs first showed "Best value" that cost more and "Step up" that was softer: fallback filling mislabeled products. Fixed, and tests now assert every label is true. Passing tests earlier did not catch it; reading real output did.

## Catalog schema
- Levels: 1 beginner, 2 intermediate, 3 advanced, 4 expert (`levelMin`/`levelMax` = range a product suits).
- Ski: `terrain{piste,mixed,offpiste,park}` scored 0-3, `waistMm`, `stiffness` 1-5, `rocker`, `priceEur`, `gender` (u/w), `lengthCm[min,max]`, `bestFor`.
- Boot: `flex`, `lastMm` (~97 narrow, ~100 medium, ~102+ wide), `gender` (u/w, boots are gendered by size range), `mondoRange`, `priceEur`, `walkMode`, `bestFor`.
- Women's models use lower flex and shorter lengths. Only women's boots are used for women; unisex + women's skis for women.
- Not in the catalog yet: ski length is computed from height/weight at runtime; budget is a hard filter on `priceEur`.

## Key decisions (provisional, pending user confirmation)
- MVP uses a **rule-based scoring engine** over a **static JSON product catalog**, running client-side, with no backend or accounts.
- Questionnaire is one question per screen, mobile first.
- Each recommendation must show a plain-language "why this fits you".
- Output is exactly 3 skis + 3 boots, ideally varied (best fit / best value / step-up).

## Open questions for the user
1. Catalog data source: manual, retailer feed, or affiliate API?
2. Monetization: affiliate links, ads, or none?
3. Language: English only, or Dutch too?
4. Preferred tech stack (plain HTML/JS vs. React/Next.js)?

## Learnings / takeaways
- Boot fit depends heavily on foot shape and professional fitting, so wording must advise in-store fitting.
- Jargon (flex, waist width, rocker, last) is the main barrier for the target audience, so a glossary and tooltips are MVP features.

## Next steps
- User reviews PRD and answers open questions.
- Delete the obsolete `ski-gear-advisor` repository on GitHub.
- User reviews the live UI and gives feedback on look, wording and flow.
- Replace placeholder catalog with real products (decide data source) and re-tune scoring weights.
- Improve the "no results" state when a boot size is outside the catalog; consider Dutch translation, affiliate links, feedback widget.
- Decide whether budget should be per item or total (currently per item) and wire `daysPerYear` into scoring.
- Later: replace placeholder data with real products once the data source is decided.
- Tooling note: python3 is not usable on this Mac (Xcode stub); Ruby and Perl work, Node is absent.
