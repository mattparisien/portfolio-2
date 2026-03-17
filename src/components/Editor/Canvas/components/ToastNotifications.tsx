"use client";

import { useState, useCallback } from "react";
import { useOthersListener } from "@/liveblocks.config";

interface Toast {
  id: number;
  name: string;
  color: string;
  kind: "join" | "leave";
}

let nextId = 0;

export default function ToastNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  useOthersListener(({ type, user }) => {
    const presence = user?.presence as { name?: string; color?: string } | undefined;
    const name  = presence?.name  ?? "Someone";
    const color = presence?.color ?? "#666";
    if (type === "enter") addToast({ name, color, kind: "join" });
    if (type === "leave") addToast({ name, color, kind: "leave" });
  });

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-20 right-6 flex flex-col items-end gap-2 z-[300] pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2.5 pl-4 pr-2 py-2.5 rounded-2xl shadow-xl text-sm font-medium select-none pointer-events-auto"
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(0,0,0,0.07)",
            animation: "toast-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          {/* Colored dot */}
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: t.color }}
          />
          <span className="text-gray-800">
            <span className="font-semibold text-gray-800">{t.name}</span>
            {" "}{t.kind === "join" ? "joined the board" : "left the board"}
          </span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="ml-1 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-black/[0.06] transition-colors cursor-pointer flex-shrink-0"
          >
            ✕
          </button>
        </div>
      ))}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
