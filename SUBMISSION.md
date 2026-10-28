# Submission

**Link:** https://lumeria-skin-report-eight.vercel.app/report/noor

Also: [/report/maya](https://lumeria-skin-report-eight.vercel.app/report/maya) · [/report/jordan](https://lumeria-skin-report-eight.vercel.app/report/jordan) · [/report/sam](https://lumeria-skin-report-eight.vercel.app/report/sam) · [load error](https://lumeria-skin-report-eight.vercel.app/report/noor?fail=1) · [unknown id](https://lumeria-skin-report-eight.vercel.app/report/alex)

**Design board (Figma):** https://www.figma.com/design/Uh2G8hFuc72m1IUrjvoKV2/?node-id=515-3

**Time spent:** _(fill in)_

Best on a phone. On a laptop the report opens inside an iPhone-sized frame; add `?frame=0` to turn that off.

## What I built

A monthly skin report for Noor, built around one question per screen.

Start at the top and scroll:

1. **Skin score card.** Pick an area with the tabs at the top (they stay pinned while you scroll). The card shows that area's latest score, its band (Good / Okay / Needs care), how far it moved this month, the trend line, and a plain-language read of the latest scan. Drag across the line to read any day.
2. **Breakdown.** The five metrics for that area. Tap one for its own page: same card layout, then highest and lowest days, then how it compares across areas.
3. **What changed.** A timeline of the month's events (the Phoenix trip, period, stopping retinol, starting azelaic acid, a week of short sleep). Each row shows which score moved and by how much over that window. If there was no scan to compare against, it says "No scan" instead of guessing.
4. **Skincare.** What she uses now, then a shelf of picks to try next. Each pick explains why it suits her skin, ingredient by ingredient, before the Buy button.
5. **November plan.** Four steps she can tick off, plus one button to turn on reminders for all of them.
6. **Ask Lumi.** Suggested questions answered from her own data.

Second-level pages: area (first vs latest photo, every scan), single scan, metric, product, pick, all notes, the score explainer and the share sheet.

## Key decisions

- **No whole-face score.** A cheek and a forehead aren't comparable, and averaging them hides what actually happened. Every score belongs to an area, and the area tabs drive the whole top block.
- **Metric names match the API** (Hydration, Evenness, Redness, Pigmentation, Oiliness). Every score is "higher is healthier", so Redness 84 means calm skin. An ⓘ next to Breakdown opens the score explainer, which says this first.
- **Explain changes, don't claim causes.** "What changed" lines events up with score windows and shows the numbers. It never says an event *caused* a change. For the same reason, product pages show what's in the product and whether it suits her, not "this product raised your score".
- **One visual language for change.** Every +/− in the app uses the same pill: indigo up, orange down, grey flat. Every score uses the same layout: number left, band and change right.
- **Apple-like rather than the README palette.** I tested the bone/forest/serif direction and moved to a quieter system (SF Pro, light grey and white surfaces, one indigo accent, orange for "needs care"). The board in Figma lays out the reasoning and the sources behind the colour choice. Purple is kept for things that matter: the score, positive change, the main buttons.
- **A small reward for showing up.** Confetti when the report first opens, a hand-drawn strike when a plan step is ticked. Both respect reduced motion.
- **Robust states.** Skeleton while loading, an error screen with retry (`?fail=1`), a clear screen for an unknown id, and empty or "unlock after more scans" cards when a person doesn't have enough data (try `jordan` and `sam`).

## Extra data I assumed

Everything below is mocked in `data/mock/extras.json` or in code, not from the API:

- **Score bands:** 0–40 Needs care, 40–70 Okay, 70–100 Good.
- **Product images, ingredients and notes** for her three products, and **three suggested products** with prices, links and research links (copied from brand sites on 2026-10-27).
- **Preferences:** fragrance-free and oil-free, used to explain why the picks suit her.
- **Plan and reminders:** reminder times (e.g. 9 PM for the treatment, 10:30 PM wind-down) and a "UV 6+" trigger for sunscreen. Turning reminders on only shows a confirmation; there are no real push notifications.
- **Lumi** answers from rules over her data. It isn't connected to a language model.
- **Photos:** the real scope photos are a team member's skin, so they are git-ignored and excluded from the deploy. The live site shows the generated placeholders.

## What I cut / would do next

- **Larger text option.** Average user age is around 38; the current type works, but I'd test a larger default.
- **Let her confirm the "why".** Show two or three possible reasons for a big change and let her pick one, so the next report learns from it.
- **Plan review.** Next month's report opens with how the November plan went.
- **Real reminders**, sharing as an image, and a proper LLM behind Lumi with guardrails against medical claims.

## How I used AI tools

I used Claude (Claude Code) as a pair: it wrote most of the code and helped with competitor research and the Figma boards. I set the direction, reviewed every screen on a phone-sized view, and rewrote or removed a lot of what it proposed. Some examples of where I overrode it:

- Removed a whole-face score and per-product "your score went up" claims, because the data can't support them.
- Removed tips, badges and extra copy it kept adding; asked for one layout for every score and one style for every +/−.
- Made the timeline rows non-tappable after finding they opened a page whose numbers didn't match the row.
- Reverted its metric renames (it had swapped Redness for "Calmness" and similar) back to the API's names.
- Picked layouts from several real-page options rather than accepting the first one.

## Anything else

Credits, all MIT: **Lumi** is Momo by mortspace (`app/report/components/lumi/LICENSE`). Icons are from **Phosphor**. Confetti is **canvas-confetti**. The plan's strike-through animation follows **Animate UI**'s Playful Todolist.
