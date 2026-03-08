# Drawing Board — UI/UX Analysis

A component-by-component audit of the collaborative drawing board interface, covering layout, interaction design, visual language, accessibility, and open issues.

---

## 1. Design Language

### What's working
- **Consistent frosted-glass system.** Every panel uses the same recipe: `rgba(255,255,255,0.92)` background + `backdropFilter: blur(12–18px)` + `border: 1px solid rgba(0,0,0,0.08)`. No component uses a drop shadow. This creates a unified, Figma-like "floating UI" feel.
- **Monochrome active states.** Active/selected tool buttons flip to black fill + white icon. This is clear, high-contrast, and doesn't require a brand color to convey state — it works at any canvas background color.
- **Spring entry animations.** Popovers use a custom cubic-bezier `(0.34, 1.4, 0.64, 1)` overshoot — slightly bouncy but fast (0.15–0.22s). This avoids the mechanical feel of linear easing and gives the UI personality without being distracting.
- **Tabular numerals.** Zoom %, stroke weight, and opacity values all use `tabular-nums`, preventing layout shift as numbers change.

### Concerns
- **No dark mode.** All panels hard-code white backgrounds. On a very dark canvas background the frosted glass looks fine, but if user fills the canvas with a white/off-white color, panels become invisible (no contrast against the background white).
- **Font inconsistency.** The board header uses `font-mono` (Maax Mono), body labels inside popovers use the default sans, and `TextToolbar` font options include Salsa and Freigeist — but these custom fonts aren't applied to the UI chrome itself. The result reads as intentional but could feel mixed.
- **Color palette.** The 5 CSS brand colors (`--color-1` through `--color-5`) are only used in the homepage zigzag button animation — none of them appear in the drawing board UI. The board UI is entirely monochrome + black, which is fine but means there's no visual connection to the broader brand identity.

---

## 2. Spatial Layout

```
┌────────────────────────────────────────────────────────┐
│  [DrawingTools]          [BoardHeader]    [ActiveUsers] │  top row
│                                                         │
│                                                         │
│                    ← canvas →                           │
│                                                         │
│         [Toolbar or TextToolbar]          [ZoomNav]     │  bottom row
│              [ToastNotifications above toolbar]         │
└────────────────────────────────────────────────────────┘
```

### What's working
- The left sidebar (DrawingTools) and bottom center bar (Toolbar) occupy entirely separate screen regions, so they rarely overlap.
- `ObjectLockButton` uses `requestAnimationFrame` to follow its target object — it never competes for a fixed screen slot.
- Remote cursors are rendered in world-space, correctly transformed to screen coords via the viewport transform.

### Concerns
- **Toolbar ↔ TextToolbar collision.** Both components render at `bottom-6 left-1/2 -translate-x-1/2`. When switching between text and non-text selections the swap is instantaneous. A brief crossfade or translate-out/in would prevent them feeling like the same element "breaking."
- **Toolbar on small screens.** `TextToolbar` has `max-width: calc(100vw - 32px)` and is horizontally scrollable, which handles overflow — but `Toolbar` and `DrawingTools` flyouts don't have equivalent overflow handling. On a viewport narrower than ~500px the DrawingTools flyouts (especially the 420px wide GifPicker) will overflow off screen to the right with no way to scroll or dismiss.
- **No mobile/touch layout.** All interactive targets meet the 40×40px minimum (good), but the overall layout is desktop-centric: left-side tool panel + bottom bar assumes a landscape, cursor-navigated environment. There is no responsive rearrangement for portrait/mobile.
- **ZoomNav positioning.** Sits at `bottom-6 right-6`, directly adjacent to where a right-side context menu might appear. It's small and visually unconnected to the bottom Toolbar. Moving it into the Toolbar's right slot (or anchoring it to the Toolbar row) would create a tighter bottom action band.
- **ObjectLockButton** floats 28px above the Fabric selection handles. When the selected object is near the top of the viewport the button will clip off screen — there's no clamping logic to keep it within bounds.

---

## 3. Component Analysis

### BoardHeader
- **Good:** Minimal, centered ID for the shared space. The `animate-spin` spinner is semantically correct ("loading") where a pulse dot was ambiguous.
- **Issue:** The header is always visible. When another popover is open the title competes for the center-top slot. If a user is typing in the GifPicker search input and the header is nearby, they're visually related by position but functionally unrelated — could be confusing.
- **Suggestion:** Consider hiding the header when any popover is open (add a `hidden` class via the same `closeSignal` pattern), or make it dismissible.

### DrawingTools (left sidebar)
- **Good:** Hover-to-peek + click-to-pin popover state machine is a solid pattern. Users can preview a flyout by hovering (120ms debounce, no accidental flashes) and pin it open with a click.
- **Good:** Visual separators between Text / Draw / Shapes / GIF sections add clear grouping.
- **Issue:** The "Draw" button's active background logic is complex: it is black when `drawPinned`, or when `tool === pencil|brush|eraser` and the popover isn't open. This means after selecting a draw tool and closing the popover the button correctly stays black — but the mental model is: "this button represents the current draw mode" not "this opens the draw menu." The pencil icon doesn't change to reflect the active sub-tool (e.g., eraser vs pencil), which may confuse users who expect the icon to update.
- **Issue:** The Draw popover has a ✕ close button, but the Shapes and GIF popovers do not — they only close on click-outside or via the toggle click. This is inconsistent.
- **Issue:** Shape icons in the Shapes flyout are rendered in a neutral `text-[#1a1a1a]`. The actual drawn shape will use the current fill color, but there's no preview of that — small color swatch in each shape chip would help.
- **Suggestion:** Show the currently active sub-tool icon in the Draw button rather than always the pencil. (This is a common pattern in Figma, Miro, etc.)

### Toolbar (bottom bar — drawing context)
- **Good:** The dual Fill / Stroke swatch layout for shapes is clean and clearly labeled.
- **Good:** Both slider popovers show a live visual preview (weight preview pill, opacity checkerboard) — this is excellent UX since range sliders give poor affordance for what the value *means* visually.
- **Issue:** `ColorPopover` is portaled to `document.body` and positioned with a fixed `anchorStyle` of `{ bottom: 88, left: "calc(50vw - 128px)" }`. This always places it dead-center regardless of which swatch triggered it. When the board is at a small zoom and the toolbar is near the bottom on a short viewport, the popover may extend above the fold. Ideally it should be anchored to its trigger button and flip up/down based on available space.
- **Issue:** There is no "reset to default" affordance for opacity or stroke weight. Users who accidentally drag the slider to 0 have no quick way back — a reset-to-default click on the label/value would help.
- **Issue:** The Toolbar is absent when the tool is `select` and nothing is selected. This is contextually correct but means there's **no affordance for changing the "next stroke" color** while in select mode — color only appears when you're in a draw mode or have something selected.

### TextToolbar (bottom bar — text context)
- **Good:** Layout is thorough — color, effects, font, size, style, alignment, line height, letter spacing. This matches what you'd expect in a full document editor.
- **Good:** The font `<select>` renders each option in its own font (via inline `font-family` style on `<option>`) — a nice touch though browser support for styled `<option>` is inconsistent (Chrome applies it, Safari/Firefox do not).
- **Issue:** The toolbar is horizontally scrollable but there's no scroll indicator. On a narrow viewport a user sees the first 3–4 controls, has no idea more exist, and may never discover alignment or letter spacing controls.
- **Issue:** Text effects (star icon) open a separate popover. All other controls are inline. The star icon at the far left gives effects equal visual weight to color — but effects are less frequently used. Reordering to put effects further from the primary color swatch might better reflect usage frequency.
- **Issue:** The `TextEffectsPopover` is portaled to `top-5 left-[86px]` — hardcoded screen coordinates. On narrow viewports this overlaps DrawingTools. It should be positioned relative to its trigger button or clamped to viewport edges.

### ColorPopover
- **Good:** The gradient builder is comprehensive: named presets, draggable stop track, per-stop color editor, direction grid.
- **Issue:** Default position `top-5 left-[86px]` is specifically designed for when it's opened from the left sidebar (TextToolbar). When opened from the bottom Toolbar the `anchorStyle` override compensates but results in a centered fixed position unrelated to the trigger. There's no smooth transition between positions.
- **Issue:** The popover always opens to `w-64` (256px). On small screens this may be truncated.
- **Issue:** Click-outside uses `mousedown` on `document`. This means that right-clicking anywhere else (context menu) will also close the popover, which may be unexpected.
- **Issue:** The "Used in document" colors section reads all Fabric objects' `fill` and `stroke` on every render. For boards with many objects this is a potential performance bottleneck — this should be computed once on open and memoized.

### GifPicker
- **Good:** Debounced search (400ms) prevents excessive API calls.
- **Good:** Masonry grid with skeleton loading gives a polished loading state.
- **Issue:** Empty state (no results) is not handled — the grid simply shows nothing with no message.
- **Issue:** The search input doesn't auto-focus when the GIF picker opens. Users must click into it before they can start typing.
- **Issue:** There's no error state if the Giphy API fails (rate limit, network error). The UI silently shows an empty grid.
- **Issue:** "Powered by GIPHY" is the brand requirement and is present — however it's in very small text and may not meet Giphy's attribution guidelines regarding minimum size.

### ZoomNav
- **Good:** Disabled states at bounds (0.25× min, 4× max) are correctly communicated with `opacity-30`.
- **Issue:** No keyboard shortcut hint (Ctrl +/−). Users may not discover zoom at all since it's in the corner.
- **Issue:** No "fit to content" or "reset to 100%" affordance. Clicking the percentage label to reset to 100% would be a very discoverable interaction.
- **Suggestion:** Add `title="Click to reset zoom"` on the `%` label and wire it to `onZoomReset`.

### ActiveUsers
- **Good:** Stacked avatars with hover tooltips follow the Figma/Miro convention. Z-index stacking on hover surfaces partially-occluded avatars.
- **Good:** Fixed `gap: -4` bug (negative gap is invalid) has been replaced with negative `marginLeft`.
- **Issue:** The online count badge (`N online`) always counts the local user. This means a solo user sees "1 online" which reads oddly — "just me" might be clearer, or hide the badge when `total === 1`.
- **Issue:** There's no "away" or "idle" state differentiation — all users look equally present regardless of activity.

### ObjectLockButton
- **Good:** The RAF-based position tracking is smooth and doesn't jitter.
- **Issue:** The button has no label — only an icon. A `title` tooltip is present but requires hover to discover. New users won't know the lock exists.
- **Issue:** No viewport clamping — if the selected object is at the very top of the canvas the lock button clips above the viewport.
- **Issue:** When multiple objects are selected (group), the lock button appears above the group bounding box. Locking a group locks all items, which may surprise users expecting to lock individually.

### ToastNotifications
- **Good:** Max 5 queued toasts and 3.5s auto-dismiss prevent pile-up.
- **Issue:** Toasts are positioned at `bottom-24` — directly above the Toolbar. When `TextToolbar` is open (which is also at `bottom-6`) and a join notification fires, they overlap.
- **Issue:** There's no dismiss button on toasts. Early dismissal requires waiting.

### RemoteCursors
- **Good:** Cursor names are color-coded per user — readable at a glance.
- **Issue:** Cursor name labels have no overflow truncation. A very long display name can extend off screen or overlap other UI elements.
- **Issue:** When the local user pans/zooms, remote cursors snap to new positions rather than animating. A brief `transition: transform 80ms linear` would smooth perceived movement.

---

## 4. Interaction Patterns

### Popover System
There are three separate popover management patterns in use:

| Pattern | Used by | Issue |
|---|---|---|
| Pin + hover state machine | DrawingTools | Complex but robust; hover delay prevents accidents |
| Controlled state in parent | Toolbar, TextToolbar | Clean, but requires prop-drilling (`closeSignal`, `colorPopoverOpenFor`) |
| Self-managed click-outside | ColorPopover, TextEffectsPopover | Simple but position is hardcoded |

All three need to coordinate via `closeSignal` (an incrementing counter) so that opening one popover closes others. This works but is fragile — any new popover-bearing component must subscribe to `closeSignal` and call `onPopoverOpened` or it will exhibit layering bugs.

**Suggestion:** A context-based popover manager would centralize open/close coordination and remove the need for prop-drilling. Something like a Radix UI or headless popover primitive would be worth adopting.

### Undo/Redo
The board has an undo stack (handled in `useFabricCanvas`) but there is no visible undo/redo UI in any of the panels. Users have no affordance for it beyond keyboard shortcuts (if any are wired). This is a significant discoverability gap.

### Tool Selection Feedback
When a user selects a tool, the only feedback is the button turning black. There's no cursor change on the canvas (the browser cursor stays as default), which weakens the tool-mode affordance. A crosshair for draw tools, a move cursor for select, etc., would dramatically improve task confidence.

### No Onboarding / Empty State
New users land on a blank canvas with no instruction. A first-run overlay, tooltip walkthrough, or visible keyboard shortcut cheat sheet would reduce the learning curve.

---

## 5. Accessibility

| Area | Status | Notes |
|---|---|---|
| Color contrast | ⚠️ Partial | Black on white: passes. But `text-gray-400` labels inside popovers fail 4.5:1 for small text |
| Keyboard navigation | ⚠️ Partial | Buttons are natively focusable; no `tabIndex` ordering enforced; popover flyouts trap no focus |
| Screen reader labels | ⚠️ Partial | `title` attributes are present on icon buttons but these are tooltips, not accessible labels (`aria-label` is needed) |
| Focus visible | ❌ Missing | No `:focus-visible` ring is defined — keyboard users have no visible focus indicator |
| ARIA roles | ❌ Missing | Popovers have no `role="dialog"` or `aria-modal`; toggle buttons have no `aria-expanded`; color swatches have no `aria-pressed` or `aria-label` with the color value |
| Reduced motion | ❌ Missing | No `@media (prefers-reduced-motion: reduce)` guard on any animation |

---

## 6. Performance Notes

- **`path:created` auto-simplify** runs synchronously on the UI thread for every completed stroke. For very long paths (>1000 anchor points) this may cause a frame drop. Consider deferring with `requestIdleCallback`.
- **`ColorPopover` document colors** — scans all Fabric objects on every render. Should be computed once on open.
- **GifPicker** mounts the full picker including API call when the GIF flyout opens. If the flyout is opened and closed repeatedly this fires many requests. Should debounce mount or cache the last result.
- **Remote cursor updates** fire on every `pointermove` at native rate. These are broadcast to Liveblocks; high cursor-move rates may hit Liveblocks throttle limits. Rate-limiting to ~30fps would reduce load.

---

## 7. Summary of Priority Issues

| Priority | Issue | Component |
|---|---|---|
| High | No visible undo/redo affordance | Global |
| High | No canvas cursor change per tool | Canvas |
| High | GifPicker flyout overflows viewport on narrow screens | DrawingTools |
| High | ColorPopover / TextEffectsPopover hardcoded screen positions | ColorPopover, TextEffectsPopover |
| Medium | ObjectLockButton clips above viewport when target is near top | ObjectLockButton |
| Medium | TextToolbar has no scroll indicator for hidden controls | TextToolbar |
| Medium | `aria-label` missing on all icon buttons | All toolbars |
| Medium | No `@media (prefers-reduced-motion)` guard | globals.css |
| Medium | Empty state missing in GifPicker | GifPicker |
| Medium | Toasts overlap Toolbar | ToastNotifications |
| Low | Active tool icon in Draw button doesn't update to sub-tool | DrawingTools |
| Low | Solo user sees "1 online" badge | ActiveUsers |
| Low | Remote cursor names not truncated | RemoteCursors |
| Low | No "reset zoom to 100%" on percentage label | ZoomNav |
| Low | `ColorPopover` doc colors computed on every render | ColorPopover |
