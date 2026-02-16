"use client";

import { useEffect } from "react";
import ErrorFallback from "@/components/ErrorFallback";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("App segment error:", error);
  }, [error]);

  return (
    <ErrorFallback
      title="Something went wrong"
      message="We could not load this page right now. Please try again."
      onRetry={reset}
    />
  );
}

