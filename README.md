# Portfolio 2 — Matthew Parisien

A Next.js 15 portfolio site featuring a sticky-scroll media gallery, animated typography, and media served from Cloudflare Images + Cloudflare R2.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Animation | GSAP 3 + ScrollTrigger |
| Smooth scroll | Locomotive Scroll 5 |
| Image hosting | Cloudflare Images |
| Video hosting | Cloudflare R2 (S3-compatible) |

## Getting Started

```bash
npm install
cp .env.example .env.local  # fill in Cloudflare credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

### Required Environment Variables

```
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_IMAGES_ACCOUNT_ID
CLOUDFLARE_IMAGES_API_TOKEN
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
CLOUDFLARE_R2_PUBLIC_URL
```

---

## Code Review & Improvement Notes

The sections below document every issue found during a full audit of the codebase, why each matters, and the changes made to address it. They are grouped by priority.

---

### 🔴 Critical — Fixed

#### 1. Duplicate `MediaItem` type definitions (3 locations → 1)

**Problem:** `MediaItem` was independently defined in `src/app/page.tsx`, `src/app/api/cloudinary-images/route.ts`, and `src/components/StickySections/StickySections.tsx`. The three definitions were subtly inconsistent (e.g. `page.tsx` had a `format` field that the API never returned; `route.ts` had `excludeFromShowcase` but `StickySections` did not). Any future field addition required touching three files, and drift was inevitable.

**Fix:** Introduced `src/types/media.ts` as the single source of truth, exporting `MediaMeta`, `MediaItem`, and `MediaGridItem` (alias of `MediaItem`). All three files now import from there.

---

#### 2. `mulberry32` and `shuffle` utilities buried inside a page component

**Problem:** Two pure utility functions (`mulberry32` seeded RNG and `shuffle`) were defined at the top of `src/app/page.tsx`. Page files should only contain UI concerns; utilities defined there cannot be reused or tested in isolation.

**Fix:** Moved both functions to `src/app/helpers/index.ts` with JSDoc explaining their purpose.

---

#### 3. Magic number seed and hardcoded e-mail address

**Problem:** The shuffle seed `125` appeared as an unexplained literal. The contact e-mail appeared as a raw string in JSX. Both values would need to be changed in two places if they ever changed.

**Fix:** Added `SHUFFLE_SEED` and `CONTACT_EMAIL` to `src/app/constants/index.ts`.

---

#### 4. `console.log` left in production code

**Problem:** `StickySections.tsx` contained `console.log('setting visible range...', start, end)` inside the hot scroll-event handler. This fires dozens of times per second and pollutes DevTools output for anyone debugging the production site.

**Fix:** Removed.

---

#### 5. Dead and commented-out code

**Problem:** `page.tsx` contained a large commented-out `<DraggableOverlay>` block and an `{/* <Intro items={media} /> */}` comment. `StickySections.tsx` had two unused `useMemo` hooks: one for `textColor` (empty body, never used) and one for `ctx` (computed but only referenced in a commented-out JSX element). Dead code increases cognitive load and creates false expectations.

**Fix:** Removed all dead code. The `DraggableOverlay` import that was only used in the removed block was removed too.

---

### 🟠 Major — Fixed

#### 6. Duplicate media style objects inside `StickySections`

**Problem:** The four-property inline style object controlling full-screen vs. constrained media dimensions was copy-pasted three times: once for the wrapper `<div>`, once for `<video>`, and once for `<img>`. Any tweak (e.g. changing `90vw` to `85vw`) required three simultaneous edits and it was easy to miss one.

**Fix:** Extracted `getMediaStyles(item: MediaItem): React.CSSProperties` at the top of the file. Both `<video>` and `<img>` now call this function; the wrapper `<div>` derives its values from the same `isFullScreen` boolean.

---

#### 7. `"true"` / `"false"` string comparisons scattered everywhere

**Problem:** Because Cloudflare Images stores metadata values as strings, `item.meta?.isFullScreen === "true"` appeared **8+ times** across the component (counting both `==` and `===` variants). A typo anywhere silently produces the wrong result, and `== "true"` (loose equality) mixed with `=== "true"` (strict) in the same file is inconsistent.

**Fix:** Added `isMetaTrue(val?: string): boolean` to `src/app/helpers/index.ts`. All call sites now read `isMetaTrue(item.meta?.isFullScreen)` — one word change fixes all instances simultaneously.

---

#### 8. `darkenHexColor` utility dead code

**Problem:** A 19-line colour-darkening utility was defined at the top of `StickySections.tsx` but never called — pure dead code.

**Fix:** Removed entirely.

---

#### 9. `ANIMATION_COLORS` duplicated between JS and CSS

**Problem:** The five animation colours (`#EE4E2B`, `#F3BE21`, `#009563`, `#F7D9D3`, `#5266AB`) were hard-coded in both `ZigzagButton.tsx` (as a `useMemo` array) and in `globals.css` (as `--color-1` … `--color-5` CSS custom properties). Changing a colour required editing both files.

**Fix:** Added `ANIMATION_COLORS` to `src/app/constants/index.ts`; `ZigzagButton.tsx` now imports and uses it. The CSS variables in `globals.css` remain (they are needed by the CSS `@keyframes` rules) but they now serve as the CSS-layer reference while the JS constant is the JS-layer reference — both point to the same documented values.

---

#### 10. Inline `Button` component defined inside a page file

**Problem:** The `Button` anchor component was declared at the bottom of `page.tsx`, making it invisible to other pages and impossible to import directly in tests.

**Fix:** Moved to `src/components/Button/Button.tsx`.

---

#### 11. `SmoothScroll.context.js` — plain JavaScript in a TypeScript project

**Problem:** The context file used `.js` instead of `.tsx`, bypassing type checking. The `children` and `options` parameters were untyped (`any`), and the context value type was inferred as `{ scroll: null }` — losing the real shape after scroll was initialised.

**Fix:** Renamed to `SmoothScroll.context.tsx`, added `LocomotiveScrollInstance`, `SmoothScrollContextValue`, and `SmoothScrollProviderProps` types.

---

#### 12. Typo in `DraggableOverlay` interface name

**Problem:** `DraggableOverlaytProps` (extra `t`) was the exported prop interface name. While harmless at runtime it's confusing during development.

**Fix:** Renamed to `DraggableOverlayProps`.

---

### 🟡 Minor — Fixed

#### 13. Duplicate `fontFamily: 'Freigeist, sans-serif'` style objects

**Problem:** The same one-liner font style was copied between `page.tsx` and `ZigzagButton.tsx`. Both files could drift independently.

**Fix:** The `page.tsx` copy is now named `proseStyle` with a clear comment; `ZigzagButton.tsx` retains its own `styles` object since it also sets `lineHeight`. The font definition itself lives in `globals.css` — the single authoritative declaration.

---

#### 14. Virtual-scroll buffer values as magic numbers

**Problem:** `bufferBefore = 3` and `bufferAfter = 2` were declared as `const` inside the scroll callback with no explanation of why those specific values were chosen.

**Fix:** Promoted to module-level named constants `SCROLL_BUFFER_BEFORE` and `SCROLL_BUFFER_AFTER` at the top of `StickySections.tsx`, each with a JSDoc comment.

---

### 🔵 Acknowledged — Not Changed (future work)

The following issues were identified but intentionally left for a future iteration to avoid scope creep:

| # | Issue | Reason deferred |
|---|---|---|
| A | `Grid.tsx` is an incomplete scaffold | Work in progress; removing it could lose context |
| B | Video dimensions hardcoded as `1920×1080` in `route.ts` | Requires upload-pipeline changes outside this PR |
| C | No unit or integration tests | Would require adding Jest/Vitest — infrastructure change |
| D | No error boundaries around media sections | Enhancement, no regression risk |
| E | `<img alt="">` — empty alt attributes | Content-dependent; meaningful alt text needs creative input |
| F | Accessibility (keyboard nav, ARIA) | Requires design decisions |
| G | No environment variable validation at startup | Enhancement |

---

## Project Structure

```
src/
├── app/
│   ├── api/cloudinary-images/   # GET endpoint — fetches images + videos
│   ├── constants/               # PALETTE, SHUFFLE_SEED, CONTACT_EMAIL, ANIMATION_COLORS
│   ├── contexts/                # SmoothScroll context (Locomotive Scroll)
│   ├── helpers/                 # fitImageToFrame, mulberry32, shuffle, isMetaTrue
│   ├── hooks/                   # useWindowWidth, useInView, useScrollHeight
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Button/                  # Inline prose link component
│   ├── DraggableOverlay/        # Canvas-based draggable image overlay
│   ├── StickySections/          # Main sticky-scroll media gallery
│   ├── Grid.tsx                 # Work-in-progress canvas grid
│   ├── SmoothScroller.tsx       # Thin wrapper around SmoothScrollProvider
│   └── ZigzagButton.tsx         # Animated button with underline styles
└── types/
    └── media.ts                 # Canonical MediaItem, MediaMeta, MediaGridItem types
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm start        # Serve production build
npm run lint     # ESLint
```
