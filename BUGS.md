# Bug Report

> Generated: 2026-04-03  
> TypeScript compiler (`npx tsc --noEmit`) reports **0 errors**.  
> All bugs below are runtime / logic issues.

---

## BUG-001 · Race Condition — `isUndoingRef` cleared before async enliven resolves

**File**: `src/components/DrawingBoard/hooks/useUndoRedo.ts`  
**Severity**: High  
**Category**: Race condition / async ordering

### Description
In both `executeUndo` (delete branch) and `executeRedo` (add branch), `isUndoingRef.current = false` is set **synchronously** at the end of the function body, *before* the `mods.util.enlivenObjects().then(...)` callback actually runs. Any canvas event that fires during the async gap (object:added, etc.) will see `isUndoingRef.current === false` and incorrectly push duplicate entries onto the undo stack.

### Affected code

`executeUndo` — delete branch:
```ts
// async work starts here…
mods.util.enlivenObjects([entry.serialized]).then((objs: unknown[]) => {
  fc.add(obj);          // ← runs asynchronously
  fc.requestRenderAll();
  saveRef.current(obj); // triggers object:modified → can push undo entry
}).catch(console.error);

// …but flag is cleared HERE, synchronously, before .then() runs:
isUndoingRef.current = false;  // ❌
```

`executeRedo` — add branch has the identical pattern.

### Fix
Move `isUndoingRef.current = false` inside the `.then()` callback (and inside the synchronous branches where no async work is done).

---

## BUG-002 · Logic Error — `setIsSyncing(false)` called before async loading completes

**File**: `src/components/DrawingBoard/hooks/useCanvasLoad.ts`  
**Severity**: Medium  
**Category**: Premature state update

### Description
`setIsSyncing(false)` is called immediately after parsing the persisted object list, before any of the actual async work (enlivening objects, fetching GIF buffers, loading video metadata, loading audio) has happened. The UI therefore transitions out of its "syncing" state while heavy media is still loading in the background.

### Affected code
```ts
void (async () => {
  const parsed = objects.map(o => JSON.parse(o.fabricJSON));
  // …sort and annotate…

  setIsSyncing(false);  // ❌ called here, but async work follows

  const enlivened = await mods.util.enlivenObjects(nonVideoParsed);
  // …GIF fetches, video metadata loads, audio loads…
  Promise.allSettled(gifDecodePromises).then(() => startGifLoop());
})();
```

### Fix
Move `setIsSyncing(false)` to be called only after all `Promise.allSettled` chains have resolved.

---

## BUG-003 · Memory Leak — Async canvas operations not guarded against unmount

**File**: `src/components/DrawingBoard/hooks/useCanvasLoad.ts`  
**Severity**: High  
**Category**: Memory leak / unmount safety

### Description
The async IIFE inside `useEffect` contains multiple `await` / `Promise.allSettled` continuations that can complete after the component unmounts. The callbacks call `fc.add(...)`, `fc.requestRenderAll()`, `startGifLoop()`, and `videoCountRef.current += 1` on objects that may no longer exist or be valid. The `useEffect` cleanup does not abort or cancel any in-flight async work.

This affects:
- GIF decode `Promise.allSettled` → `startGifLoop()`
- Video restore `Promise.allSettled` → `fc.moveObjectTo()`, `startGifLoop()`, `fc.requestRenderAll()`
- Audio restore (similar pattern)

### Affected code
```ts
useEffect(() => {
  if (!isReady) return;
  void (async () => {
    // Possibly seconds of async work below…
    Promise.allSettled(restorePromises).then(results => {
      fc.add(imgObj);       // ❌ may fire after unmount
      startGifLoop();       // ❌ may fire after unmount
      fc.requestRenderAll(); // ❌ may fire after unmount
    });
  })();

  return () => {
    // ❌ No cancellation of in-flight async work
  };
}, [isReady]);
```

### Fix
Add an `unmounted` flag at the top of the effect and set it to `true` in the cleanup. Guard every async continuation with `if (unmounted) return;`.

---

## BUG-004 · Memory Leak — XHR upload not aborted on unmount

**File**: `src/components/DrawingBoard/hooks/useDragDropUpload.ts`  
**Severity**: High  
**Category**: Memory leak / missing cleanup

### Description
`uploadFile` creates a new `XMLHttpRequest` for each dropped file but never stores or aborts it. If the component unmounts while an upload is in progress, the XHR `onload`, `onerror`, and `onprogress` callbacks continue to fire and call `updateProgress` / `completeUpload` from the upload-progress context — updating state on an unmounted tree.

### Affected code
```ts
const xhr = new XMLHttpRequest();
xhr.open("POST", endpoint);

xhr.upload.onprogress = (event) => {
  updateProgress((event.loaded / event.total) * 100); // ❌ fires after unmount
};
xhr.onload = () => {
  completeUpload();  // ❌ fires after unmount
  // …
};
xhr.onerror = () => completeUpload(); // ❌ fires after unmount

xhr.send(formData);
// ❌ xhr reference is never kept; cannot be aborted
```

### Fix
Store `xhr` in a `useRef` (or a local array ref for multiple concurrent uploads) and call `xhr.abort()` in a `useEffect` cleanup or in a component-level abort controller.

---

## BUG-005 · Memory Leak — `setTimeout` in `ToastNotifications` not cleared on unmount

**File**: `src/components/DrawingBoard/components/ToastNotifications.tsx`  
**Severity**: Medium  
**Category**: Missing cleanup / stale state update

### Description
`addToast` schedules a `setTimeout(..., 3500)` to auto-dismiss each toast but never saves the timer ID. The timeout can fire after the component unmounts, calling `setToasts` on an unmounted component and triggering a React warning.

### Affected code
```ts
const addToast = useCallback((toast: Omit<Toast, "id">) => {
  const id = nextId++;
  setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
  setTimeout(() => dismiss(id), 3500); // ❌ never cleared
}, [dismiss]);
```

### Fix
Collect timer IDs in a `useRef<ReturnType<typeof setTimeout>[]>` and clear them all in a `useEffect` cleanup:
```ts
const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

useEffect(() => {
  return () => timersRef.current.forEach(clearTimeout);
}, []);

// in addToast:
timersRef.current.push(setTimeout(() => dismiss(id), 3500));
```

---

## BUG-006 · Memory Leak — Drag event listeners on `window` not cleaned up on unmount

**File**: `src/components/ui/ScrubbableControl.tsx`  
**Severity**: Medium  
**Category**: Memory leak / dangling event listeners

### Description
When the user starts a scrub drag, `handleScrubDown` attaches `mousemove` and `mouseup` listeners directly to `window`. These listeners are **only removed when `mouseup` fires**. If the component unmounts while a drag is in progress (e.g., the properties panel closes before the user releases the mouse), the listeners remain on `window` permanently, keeping closures over stale `onChange` and canvas references alive indefinitely.

### Affected code
```ts
const handleScrubDown = useCallback((e: React.MouseEvent) => {
  // …
  const onMove = (ev: MouseEvent) => { /* … */ };
  const onUp   = () => {
    dragging.current = false;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup",   onUp);
  };

  window.addEventListener("mousemove", onMove); // ❌ never cleaned up on unmount
  window.addEventListener("mouseup",   onUp);   // ❌ never cleaned up on unmount
}, [value, sensitivity, step, onChange, clamp]);
```

### Fix
Extract the cleanup into a `useRef` so it can be called from a `useEffect` cleanup:
```ts
const cleanupDragRef = useRef<(() => void) | null>(null);

useEffect(() => {
  return () => cleanupDragRef.current?.();
}, []);

// inside handleScrubDown, after adding listeners:
cleanupDragRef.current = () => {
  window.removeEventListener("mousemove", onMove);
  window.removeEventListener("mouseup", onUp);
};
```

---

## Summary

| ID | File | Category | Severity |
|----|------|----------|----------|
| BUG-001 | `hooks/useUndoRedo.ts` | Race condition | High |
| BUG-002 | `hooks/useCanvasLoad.ts` | Premature state update | Medium |
| BUG-003 | `hooks/useCanvasLoad.ts` | Memory leak / unmount | High |
| BUG-004 | `hooks/useDragDropUpload.ts` | Memory leak / missing cleanup | High |
| BUG-005 | `components/ToastNotifications.tsx` | Missing cleanup | Medium |
| BUG-006 | `ui/ScrubbableControl.tsx` | Dangling event listeners | Medium |
