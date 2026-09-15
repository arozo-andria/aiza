"use client";

import { useEffect } from "react";

// Only register in production - a cache-first SW during `next dev` would
// serve stale pages while iterating.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: the app still works without the offline shell.
    });
  }, []);

  return null;
}
