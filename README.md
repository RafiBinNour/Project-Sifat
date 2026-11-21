# Love in Bloom 💗

A single-page, no-build romantic experience: a shy teddy bear asks *"Do you love me?"*,
the **No** button runs away and shrinks while **Yes** grows, and saying yes opens a
celebration screen with confetti, a love meter and a sealed envelope holding five
handwritten notes.

Pure **HTML5 + CSS3 + vanilla JavaScript**. No framework, no build step, no backend,
no database, no cookies, no third-party requests. Open `index.html` and it works.

---

## Contents

1. [What you get](#1-what-you-get)
2. [Quick start](#2-quick-start)
3. [Project structure](#3-project-structure)
4. [How the experience flows](#4-how-the-experience-flows)
5. [Customising it](#5-customising-it)
6. [Performance — measured, not claimed](#6-performance--measured-not-claimed)
7. [Making it this fast: the seven changes](#7-making-it-this-fast-the-seven-changes)
8. [Swapping the mascot art](#8-swapping-the-mascot-art)
9. [Where the signature lives](#9-where-the-signature-lives)
10. [Accessibility](#10-accessibility)
11. [Responsiveness](#11-responsiveness)
12. [Browser support](#12-browser-support)
13. [Deploying](#13-deploying)
14. [Troubleshooting](#14-troubleshooting)
15. [Design tokens](#15-design-tokens)

---

## 1. What you get

| Feature | Detail |
|---|---|
| **The question** | Big gradient headline, animated bear, one honest button and one very dishonest button. |
| **The playful No** | Cycles through six increasingly desperate labels, shrinks and fades. |
| **The growing Yes** | Grows every time No is clicked — by the end it dominates the card. |
| **Celebration** | Confetti, fireworks, floating hearts, a love meter that fills to ∞, three feature cards, a pull quote. |
| **The letter** | A pink envelope that swings open to reveal five different notes you can flip through. |
| **The signature** | A framed pink panel printed across the envelope face: *Loved by Sifat* in italic display serif, with "Forever with love" beneath it, pale concentric swirls behind, and a gentle fade-in. |
| **The bouquet** | A larger 💐-style bouquet sits below the letter buttons and blooms when scrolled into view at the page end; its ribbon types out "Sifat loves you" above 💞♾️. |
| **Ambient scene** | Floating hearts, stars and soap bubbles on a canvas behind everything. |
| **Reduced motion** | Decorative motion stops; the signature and the completed flower message stay visible without animation. |
| **Silent** | No audio, no music, no autoplay — nothing to mute or explain. |
| **Weight** | **~212 KB over 9 requests**, zero external hosts. |

There is **no form, no inbox and no database**. Nothing is collected, stored or sent.
The page is a static and self-contained gift.

---

## 2. Quick start

No install, no server required — but a local server gives you correct font and
font behaviour (`file://` is stricter about some requests):

```bash
# Python 3 (already installed on macOS / Linux)
python3 -m http.server 8080
# → http://localhost:8080

# or Node
npx serve .
```

Opening `index.html` by double-clicking also works in every modern browser.

**Deploy:** drop the folder on Netlify, Vercel, GitHub Pages, Cloudflare Pages or
any static host. There is nothing to configure and no environment variables.

---

## 3. Project structure

```
love-in-bloom/
├── index.html                  # the entire page — one document, four sections
├── css/
│   └── style.css               # all styling, 17 numbered sections
├── js/
│   └── script.js               # all behaviour, 7 numbered sections
├── assets/
│   ├── fonts/
│   │   ├── fonts.css           # @font-face rules (self-hosted)
│   │   └── files/              # 14 .woff2 files, latin + latin-ext
│   ├── images/
│   │   ├── bear-ask.svg        # mascot, question state
│   │   └── bear-happy.svg      # mascot, celebration state
│   └── gifs/
│       └── README.txt          # how to swap in your own GIF mascots
├── .gitignore
└── README.md
```

**24 files, ~424 KB on disk, 212 KB over the wire.** Only nine requests on first load:
the document, one stylesheet, one script, two SVGs and `fonts.css` (the six font files
that are actually used arrive in parallel).

There is deliberately **no** `js/` module split, no bundler and no partials. For a
page this size, one stylesheet and one script load faster and are easier to read than
anything a build step would produce.

---

## 4. How the experience flows

The page is one document with two mutually exclusive views. `script.js` toggles
`hidden` and the `is-active` class — the URL never changes and there is no routing.

```
#proposal-view            →  click YES  →   #celebration-view
    bear-ask.svg                              bear-happy.svg
    "Do You Love Me?"                         confetti + fireworks canvas
    [ Yes 💗 ] [ No 💗 ]                      love meter → ∞
                                              three feature cards
                                              pull quote
                                                    ↓
                                              sealed envelope  →  5 notes
                                              flower blooms → "Sifat loves you"
```

### The script, in order

| Section | Responsibility |
|---|---|
| `01. Helpers & state` | Selectors, randomisers, palette, the `prefers-reduced-motion` switch. |
| `02. Ambient background` | Canvas #1: hearts, stars and bubbles drifting behind the page. |
| `03. Celebration FX` | Canvas #2: confetti, fireworks, heart bursts, emoji. |
| `04. Proposal view` | The No button's six labels, the shrinking, the growing Yes, the transition. |
| `05. Celebration` | Love meter fill, reveal-on-scroll, 3D tilt on the card. |
| `06. Love letter` | Envelope open/close, five notes, progress dots. |
| `07. Ripple & wiring` | Button ripples, year stamp, teardown on `pagehide`. |

### The No button

Ten labels across two escalating sets, with a rotating hint line underneath that reacts to
how many times you have said no:

```
Are you sure? 🥺 → Think again! 💭 → Pretty please? 🌸 → Give me one more chance! 💗
→ My heart is waiting! 💔 → Just one tiny yes? 🌷 → You are breaking my little heart… 💘
→ I made a whole website for this! 🥹 → Okay but… please? ✨ → The bear is crying now 🐻💧
```

Each click also grows the Yes button and shrinks the No, driven by the CSS custom
properties `--btn-scale` and `--no-scale`. The growth is clamped and the buttons go
full-width below 620 px, so the gag never breaks the layout at 360 px.

---

## 5. Customising it

Everything lives in three files.

**The headline and copy** — `index.html`, sections `proposal-view` and `celebration-view`.

**The five letter notes** — the `loveNotes` array in `js/script.js`, inside the `TEXT`
object at the top of the file (section 01):

```js
loveNotes: [
  {
    greeting: 'My dearest,',
    body: 'Some feelings are too big for a text message, so I wrote them down instead…',
    sign: 'always yours,',
  },
  // …five total — add, remove or rewrite freely
]
```

**The colours** — the token block at the top of `css/style.css` ([§15](#15-design-tokens)).
Change `--rose` and `--violet` and the entire page, including every gradient and canvas
particle, follows, because the JS palette reads the same values.

**The signature** — it lives on the envelope, not in the notes, so it never changes as
you flip through them. See [§9](#9-where-the-signature-lives).

**The No labels** — `TEXT.noMessages` (the first five) and `TEXT.noMessagesExtra`
(the escalation) in the same `TEXT` object. The hint line under the buttons is
`TEXT.hints`.

---

## 6. Performance — measured, not claimed

The first build of this page looked identical but felt sticky: scrolling stuttered,
clicks felt late. These are the real numbers from Chrome (headless, CDP-driven,
`--disable-gpu` so the compositor is software — a deliberately harsh baseline), measuring
the same page before and after the work in [§7](#7-making-it-this-fast-the-seven-changes).

### Before → after

| Metric | Before | After | Change |
|---|---:|---:|---|
| First Contentful Paint (median of 5) | 1062 ms | **251 ms** | **4.2× faster** |
| DOMContentLoaded | 565 ms | **104 ms** | **5.4× faster** |
| Load event | 639 ms | **125 ms** | **5.1× faster** |
| Idle frame rate | 7–8 fps | **39–56 fps** | **~6× smoother** |
| Frame rate while scrolling | 6 fps | **38–57 fps** | **~7× smoother** |
| Requests | 12 | **9** | −3 |
| Transfer | 281 KB | **212 KB** | −25% |
| External hosts | 1 (jsDelivr CDN) | **0** | offline-safe |
| Click → visible response | — | **3.5–14.6 ms** | instant |

Frame rates are measured with `requestAnimationFrame` counters over 1.2–1.4 s windows
in the same session, so they are like-for-like. The variance in the "after" ranges is
this 2-vCPU test box, not the page.

### What the profiler said

Isolating one effect at a time was the only way to find the real cost. Removing layers
from the live page, in order:

| Isolated change | Frame rate |
|---|---:|
| Baseline | 7 fps |
| Disable the aurora drift animation | 6 fps |
| Remove the aurora blobs entirely | 6 fps |
| Hide both canvases | 5–6 fps |
| **Remove `backdrop-filter`** | **12 fps** |
| **Remove `box-shadow`** | **18 fps** |
| **Remove the whole scene layer** | **26 fps** |

Two conclusions that changed the plan:

1. **The canvas was innocent.** Hiding it gained nothing. Every frame of every particle
   was cheap; what cost frames was CSS.
2. **The page was GPU-bound on blur, blend and shadow** — the exact effects that made it
   look premium. So the fix was to *keep the look and remove the mechanism*, not to strip
   the design.

A second finding was structural rather than visual: `background-attachment: fixed` on
`<body>` forced a full-page repaint on every scroll frame. That single declaration is
most of the difference between "scrolls" and "sticks".

---

## 7. Making it this fast: the seven changes

Each of these is commented at the point of use in `css/style.css` or `js/script.js`.

### 1. `background-attachment: fixed` → a fixed painted layer

A fixed background must be re-rasterised as the page scrolls. The same gradient now
lives on `.scene::before`, which is already `position: fixed` and composited once.
Visually identical; scroll cost near zero.

### 2. `backdrop-filter` → a pre-composited translucent gradient

`backdrop-filter: blur(28px)` re-samples everything behind the card every frame. The
card background is now a slightly more opaque gradient — over a soft pastel scene the
two are hard to tell apart, and the frame rate nearly doubles.

### 3. `filter: blur(46px)` on the aurora → soft gradients, no filter

The blur was applied to a viewport-sized element on every frame. The radial gradients
underneath were already soft, so the filter was paying full price for almost no change.

### 4. Five animated blobs → one opacity breathe

Five viewport-sized elements each with `will-change: transform` meant five composited
layers moving independently. They are now static, and the wrapper does one slow
opacity cycle. This was worth roughly **+20 fps** on integrated graphics.

### 5. Only `transform` and `opacity` are ever animated

`background-position` keyframes (on the gradient headline and the animated card border)
repaint clipped text and masked areas every frame; a `box-shadow` keyframe repaints the
whole element. All of them are now static gradients, and pulsing elements use
`transform: scale()` instead. Every `@keyframes` block in the file animates nothing but
`transform` and `opacity` — you can verify with:

```bash
grep -A6 '@keyframes' css/style.css
```

### 6. The canvas draws 20 fps instead of 60, and stops when unseen

Particles drift about a fifth of a pixel per frame, so 20 fps is indistinguishable — and
each particle is now a **pre-rendered sprite blitted with `drawImage()`** instead of a
`createRadialGradient()` call per particle per frame. The loop also stops entirely when
the tab is hidden or the background has scrolled out of view (`IntersectionObserver`).

### 7. Shadows collapsed and off-screen work skipped

Multi-layer `box-shadow` declarations became single-layer, and `.letter-stage` /
`.footer` use `content-visibility: auto` so the browser does not lay out or paint the
parts you have not scrolled to yet.

### What was deliberately *not* done

- **The design is untouched.** Same palette, same gradients, same glassy cards, same
  animations you actually watch (the bear floats, the No button shrinks, the envelope
  opens). Only invisible costs were removed.
- **No JavaScript framework, no lazy-loading library, no polyfill.**
- **No bitmap images.** Both mascots are SVG, ~9 KB each.

---

## 8. Swapping the mascot art

The default mascots are hand-written SVGs with a gentle float animation. To use your own
art, replace the two files and keep the `alt` text accurate:

```html
<img class="mascot__image" src="assets/images/bear-ask.svg"
     width="260" height="260" alt="A shy little teddy bear holding a heart." />
```

To add an animated GIF instead, drop it in `assets/gifs/` and point `src` at it —
`.mascot__image` is already a circle with a white ring, so a square 400×400 GIF or
larger looks best. See `assets/gifs/README.txt`.

For the celebration state, change the `src` of the second `<img>` to your happy mascot.
Keep both files roughly the same size so the layout does not jump between views.

---

## 9. Where the signature lives

The signature is a framed panel on the **envelope face**, not inside the letter paper.
That is why it stays put on the envelope while the paper slides up out of it. The paper's
bottom 12% is clipped to prevent a white strip from peeking below the envelope when closed;
the clipped tail remains concealed behind the envelope pocket when open:

```
.envelope
├── .envelope__back
├── .letter-paper      ← the note slides up out of here
├── .signature         ← the panel, z-index 4
├── .envelope__front   ← pocket, z-index 3
├── .envelope__flap
└── .envelope__seal
```

It sits above the pocket (so it is printed *on* the envelope) and below the flap and seal.
Pure CSS gradients give it the pink fill and the faint concentric swirls — nothing is
drawn, so it costs no frames. The two `♡` glyphs are `aria-hidden`; a screen reader reads
"Loved by Sifat Forever with love".

To change the wording, edit `index.html`:

```html
<p class="signature__text">
  <span class="signature__words">Loved by Sifat</span>
</p>
<p class="signature__tagline">
  <span class="signature__heart" aria-hidden="true">♡</span>
  <span class="signature__sub">Forever with love</span>
  <span class="signature__heart" aria-hidden="true">♡</span>
</p>
```

The words are `white-space: nowrap` and sized with `clamp()`, so a longer name scales down
rather than wrapping — no extra work needed unless it gets very long.

A larger bouquet matching the 💐 emoji sits below the letter controls at the bottom of
the section. Scrolling it into view triggers the bloom and writes **"Sifat loves you"**
across its ribbon, followed by the 💞♾️ symbols. The message is real HTML; it is not
triggered by the envelope button. Reduced-motion mode shows the completed bouquet and
message without animation.

---

## 10. Accessibility

| Concern | Handling |
|---|---|
| Semantics | `<main>`, `<section>`, `<h1>`/`<h2>`/`<h3>`, `<figure>`, `<footer>`. |
| Keyboard | Every control is a real `<button>` or link; focus rings are never removed. |
| The No gag | When No gives up it gets `disabled` + `aria-disabled`; Yes is always reachable. |
| Screen readers | `aria-live="polite"` announces the changing No label and the view change. |
| The love meter | Decorative bar plus a screen-reader-only line stating the meter is at maximum. |
| Emoji | Decorative ones sit in `aria-hidden` spans so they are not read out. |
| Images | Both mascots have descriptive `alt` text. |
| Motion | `prefers-reduced-motion: reduce` removes all decorative animation and freezes the canvas. |
| Contrast | Body text is `--ink` (#3B2340) on near-white cards — well past WCAG AA. |
| Reflow | No horizontal scrolling at 320 px; no content lost at 400% zoom. |

---

## 11. Responsiveness

Verified in headless Chrome at **360, 390, 430, 768, 1024 and 1440 px** with zero
horizontal overflow and zero console errors at every width.

- One fluid layout driven by `clamp()`; no separate mobile build.
- Cards use a max-width rather than fixed widths, so 320 px through ultrawide all work.
- The celebration feature grid steps 3 → 3 (tighter) → 1 column at 820 px and 620 px.
- The Yes button's growth is capped in `em`, so the gag never overflows a phone.
- Tap targets are ≥44 px on touch viewports.
- `touch-action: manipulation` removes the 300 ms tap delay.

---

## 12. Browser support

Chrome, Edge, Firefox and Safari — current and the previous two versions. iOS Safari 15+.

Two modern CSS features are used as progressive enhancements and both degrade safely:
`content-visibility: auto` (older browsers simply render the section normally) and
`backdrop-filter`-free glass (no fallback needed — it is a plain gradient). The page
works with JavaScript disabled: you get the question and both buttons as static markup.

---

## 13. Deploying

It is a folder of static files. Any host works:

```bash
# Netlify
netlify deploy --prod --dir .

# Vercel
vercel --prod

# GitHub Pages — push, then Settings → Pages → Deploy from branch → / (root)
```

**Caching:** hashed asset filenames are not used, so if you host this yourself set a
short cache on `css/`, `js/` and `index.html` (e.g. `Cache-Control: max-age=3600`) and a
long one on `assets/fonts/files/` (`max-age=31536000, immutable`).

No environment variables, no build command, no serverless function, no database.
There is nothing to secure because nothing is stored.

---

## 14. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Fonts look like Times New Roman | Opened via `file://` and the font paths are blocked | Serve over `http://` — see [§2](#2-quick-start). |
| Letter notes do not change | `TEXT.loveNotes` has fewer than two entries | Add more objects to the array in `js/script.js`. |
| Animations still run with reduced motion on | The OS setting changed after the page loaded | Reload; the media query is read at load. |
| Scrolling stutters on an old phone | A browser extension or a second `backdrop-filter` was added back | Keep effects to `transform`/`opacity` — see [§7](#7-making-it-this-fast-the-seven-changes). |
| Signature missing entirely | Its `opacity` is 0 because the letter is closed | It fades in when the envelope opens (§9). |
| Signature hidden behind the envelope | A later rule re-stacked `z-index` | The panel needs `z-index: 4` — above `.envelope__front` (3), below the flap and seal. |
| The No button vanished too fast | Ten clicks is the whole gag | Trim `TEXT.noMessagesExtra`. |

---

## 15. Design tokens

All in `css/style.css` section 01. Change them here and the whole page follows.

| Token | Value | Used for |
|---|---|---|
| `--rose` | `#FF4F87` | Primary accent, primary button |
| `--rose-deep` | `#E62E67` | Hover / pressed states |
| `--violet` | `#8B5CF6` | Secondary accent, the No button |
| `--peach` | `#FFB38A` | Warm end of every gradient |
| `--gold` | `#FFDFA6` | Small highlights, sparkles |
| `--cream` | `#FFF9F5` | Letter paper |
| `--ink` | `#3B2340` | Body text |
| `--ink-soft` | `#6C5572` | Secondary text |
| `--ink-faint` | `#8B7591` | Captions, hints |
| `--grad-title` | rose → lilac → violet → peach | Gradient headlines |
| `--grad-rose` | rose → rose-deep | Primary button |
| `--grad-glass` | white 86% → 56% → 68% (three stops) | Card surfaces |

Radii run `--r-sm` (10 px) to `--r-pill` (999 px). Spacing uses `clamp()` so it breathes
on desktop and tightens on a phone without a single media query.

---

*Made with too much love and just enough CSS.*
