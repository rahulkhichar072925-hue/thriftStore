"use client";

import { useEffect } from "react";
import ErrorFallback from "@/components/ErrorFallback";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Global app error:", error);
  }, [error]);

  return (
    <html>
      <body className="bg-slate-50">
        <ErrorFallback
          title="Application error"
          message="A critical error occurred. Please retry or return to home."
          onRetry={reset}
        />
      </body>
    </html>
  );
}

