"use client";

import { useState, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "crumb_cookie_consent";

// Set NEXT_PUBLIC_PERSIST_COOKIE_CONSENT=true in .env.local to prevent the
// banner from being dismissed across reloads — useful during development.
const DEBUG_PERSIST =
  process.env.NEXT_PUBLIC_PERSIST_COOKIE_CONSENT === "true";

// ---------------------------------------------------------------------------
// Lightweight reactive store so other components can subscribe to consent state
// without a Context provider.
// ---------------------------------------------------------------------------
type Listener = () => void;
const listeners = new Set<Listener>();
let _pending = true; // assumed pending until resolved client-side

function setGlobalPending(value: boolean) {
  _pending = value;
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return _pending;
}

/** Returns true while the cookie consent banner is visible. */
export function useCookieConsentPending() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const pending = DEBUG_PERSIST || !localStorage.getItem(STORAGE_KEY);
    setGlobalPending(pending);
    setVisible(pending);
  }, []);

  const accept = () => {
    if (!DEBUG_PERSIST) {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setGlobalPending(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    // Full-screen overlay — pointer-events: auto (default) so all interaction
    // with the page behind is blocked while consent is pending.
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center pb-6 px-4 font-serif"
      style={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        // background: "rgba(0,0,0,0.18)",
        pointerEvents: "auto",
      }}
    >
      <div
        className="flex flex-col items-center gap-3 px-5 py-3 rounded-md text-xl bg-fg text-bg max-w-md"
      >
        <span>
          Cookies help us improve your browsing experience, provide personalized ads, and analyze site traffic. By clicking “Accept All,” you agree to our use of cookies and accept our Privacy Policy. You may also customize your preferences.
        </span>
        <button
          onClick={accept}
          className="pb-2 underline underline-offset-2 cursor-pointer self-start flex-shrink-0 font-medium decoration-1 text-sm hover:no-underline"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
