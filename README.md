# Lumeria take-home: The Skin Report

Thanks for spending time on this. We're a small team building a skin-tracking app.
A person scans an area of their skin every few days, and we turn each scan into a
handful of scores, a plain-language read and one thing to try. Over weeks, those
scans add up to a picture of how their skin is changing.

**Your job: build a skin report that is on-brand and gives the person an immersive
experience, using the mock data we give you about their skin.** Most people will open it
on their phone.

Clone it, build in your own repo or fork, and send us the link when you're done.

> ### Emily, start here
>
> - **Your main dataset is `noor`**: one month (Sep 23 to Oct 22, 2026) of near-daily scans.
>   Each scan has a timestamp, five metrics plus an overall score, the person's own notes and
>   tags, synced health data (sleep, steps, resting heart rate, HRV, water, cycle day), and where
>   it was taken with that day's UV, humidity, temperature and air quality. The report also lists
>   **three products with start and end dates**. Open `/report/noor`, or read
>   `data/reports/noor.json` directly.
> - There's a story in the month. Can the report help Noor see it? `maya`, `jordan` and `sam`
>   are extra edge cases if you want to check your design against them.
> - **Format is open.** This is a UI/UX role. A coded Vercel site, a clickable Figma prototype,
>   or a mix are all welcome, as long as we can open and use it from a link.
> - You'll **present your work later this week** (book your slot by Wednesday).
>   Plan for about 15 minutes, followed by Q&A.
> - **Real scan photos come separately.** We'll send you 33 photos from our three-light scope,
>   showing a team member's own skin. Drop them into `public/scans/` as they are (e.g.
>   `noor_scan_01.jpg`, `noor_scan_01-polarized.jpg`, `noor_scan_01-uva.jpg`) and they replace the
>   placeholders automatically. They're git-ignored, so please keep them out of any public repo.
> - To submit, email anthea@lumeria.skin your link (Vercel, Figma, or similar) plus your
>   filled-in `SUBMISSION.md` before Monday's presentation.
> - Questions: anthea@lumeria.skin

---

## The brief

Build a report that a person would actually *want* to open and come back to. It should
feel like Lumeria (see **Brand** below), not like a dashboard. Using the data in
`GET /api/reports/:id`, it should let someone answer:

1. **How is my skin today?** The latest scan: its scores, what we saw, and the tip.
2. **Is it getting better?** How the scores have moved over time.
3. **What's behind the numbers?** Enough detail to dig into any one scan.

How you lay that out, what you emphasise, and what you leave out is up to you.
Those choices are the most interesting part of the exercise.

### Must have

- **Mobile first.** Design for a ~375 px wide phone screen. It should be comfortable
  to use with one thumb. Desktop can simply be "the phone layout, centred".
- **Easy to share and fully usable.** A Vercel deployment is the default and the
  easiest route (see below). Any other format is fine too, such as a native build,
  a prototype or an interactive video, as long as we can open and use it from a link.
- **Keep `/report/:id` working** (`/report/maya`, `/report/jordan`, `/report/sam`) if
  you build a web page. Our review gallery loads that route for each person.
- **Works for all three people** in the mock data (see below). Each one stresses the
  design in a different way.
- **Loading, empty and error states** that a real person would understand. The API is
  deliberately slow, and `?fail=1` forces an error.

### Nice to have (pick any, or none)

Comparing two scans side by side · filtering by body area · smooth transitions ·
accessibility (screen readers, contrast, reduced motion) · dark mode · tests ·
anything else you think a person would genuinely want.

We would much rather see **a few things done really well** than everything done halfway.

### Please don't

- Make medical claims. This is a wellness product. Say "looks drier than usual", not
  "you have eczema". No diagnoses.
- Change the existing API's behaviour (`app/api/**`) or the provided data files.

### Want more data? Go for it

**You can assume we can collect any additional data about a person's skin** (more
metrics, photos over time, routines, weather, product use, whatever makes the experience
better). Mock it yourself in a new file or endpoint, and list what you assumed in
`SUBMISSION.md`. We're interested in what you think is worth collecting.

---

## Brand

Lumeria feels like *a warm, sunlit atelier of bone paper, deep evergreen and burnished
bronze*: calm, premium and warm, never clinical. The voice is a knowledgeable big sister:
kind, plain-spoken, encouraging. You don't have to use any of the following, but it's
a good place to start.

| Token | Hex | Use |
| --- | --- | --- |
| bone | `#f4efe6` | page background |
| sand | `#e8dfce` | cards, dividers |
| bronze | `#c0913f` | accents, highlights |
| bronze-deep | `#80601f` | accent text on light backgrounds |
| forest | `#2f4a35` | primary actions, positive signals |
| evergreen | `#14241a` | dark surfaces |
| bark | `#2e2620` | body text |
| clay | `#b8533a` | needs attention (use sparingly) |

Typeface: **Montserrat** (free on Google Fonts), with light weights for titles and
letter-spaced small caps for labels. Rounded corners, generous whitespace, soft glassy
surfaces.

---

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

The starter is the **simplest possible version** of the report: one unstyled page
and a table. It proves the data flows end to end, and it has rough edges on purpose.
Treat it as a starting point you can rewrite completely. Use any libraries you like
(UI kits, charting, CSS frameworks). Next.js is already set up, but you're welcome to
switch to another framework that deploys on Vercel.

### Deploying

If you build a web page, the easiest way to deploy is with the Vercel CLI, from a free
Hobby account:

```bash
npx vercel          # first run: log in, accept the defaults
npx vercel --prod   # gives you the public URL to submit
```

You can also fork this repo and use Vercel's "Import Git Repository". The real scan
photos aren't in git, so a deploy from GitHub shows the placeholders, which is fine for
submitting.

---

## The data

`GET /api/reports/:id` returns one person's report. The ids are `noor`, `maya`, `jordan` and `sam`.
The full types are in [`lib/types.ts`](lib/types.ts).

| Person | What's interesting |
| --- | --- |
| `noor` | **One month, every field.** Notes and tags, health data, location and weather, and three products with start and end dates (`products`). |
| `maya` | 28 scans over ~11 weeks across two areas. Steady progress, with a rough patch in the middle. |
| `jordan` | Just signed up. Exactly one scan. |
| `sam` | Sparse, irregular scans across several areas. Some fields are missing, one summary is long, and the people who built the API didn't sort anything. |

Things worth knowing:

- **Every score is 0–100, and higher is always healthier.** That includes `redness` and
  `oiliness`: a redness score of 85 means calm skin, not very red skin. How you
  communicate that to a person is part of the design problem.
- `overall` is the average of the other scores that were measured.
- `oiliness` is `null` when a scan couldn't measure it. `photoUrl` can be `null`.
  `skinType` can be `null`.
- `scans` come back in **no guaranteed order**.
- Scans of different body areas aren't directly comparable. A forehead and a forearm
  have different "normal" scores.
- `checkin` is optional context the person logged themselves (sleep, water, stress).
- In `noor`, 11 scans get **real photos from our three-light scope** once you add the photos we send you. Those scans then also have `photos.ambient`, `photos.polarized` (glare removed, so redness and pigment under the surface show) and `photos.uva` (365 nm UV, where oil and bacteria fluoresce). The other photos are generated placeholders.
- In `noor`, a product is in use on every day from `startDate` through `endDate` (`null` means still in use). Connecting products to how the skin changed is fair game.
- Everyone in the data is fictional.

---

## Timebox and submission

Please spend **about 4–6 hours**. You don't need to finish everything. If you run out of
time, write down what you would do next. That counts.

To submit, before the deadline in your invite:

1. Push your work to your own repo (or share your Figma/prototype link).
2. Fill in [`SUBMISSION.md`](SUBMISSION.md) with your link (Vercel URL or other) and
   notes, then push it.
3. Email anthea@lumeria.skin the link.

**AI tools** (Claude, Copilot, Cursor, etc.) are welcome. Tell us in `SUBMISSION.md` how
you used them. In the follow-up conversation we'll ask you to walk us through your code and
the decisions behind it, so make sure you understand everything you ship.

## How we'll look at it

We'll open your link on an actual phone first. Then we'll read the code.

- **Experience and brand.** Is it immersive? Does it feel like Lumeria?
- **Product judgement.** Does it answer the three questions? Would a real person
  understand it? Did you make sensible calls on what to show and what to leave out?
- **Craft on mobile.** Layout, typography, touch targets, performance, and how it feels
  to use.
- **Robustness.** All three people, slow loads, errors, missing data.
- **Code quality.** Readable, sensibly structured, easy for a teammate to pick up.
- **Communication.** Your `SUBMISSION.md`: what you chose, what you cut, any extra data
  you assumed, and why.

Questions? Reply to your invite email. We'd rather you ask than guess.
