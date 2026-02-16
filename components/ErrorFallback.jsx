"use client";

import Link from "next/link";

export default function ErrorFallback({ title, message, onRetry, showHome = true }) {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          !
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-600">{message}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Try Again
            </button>
          ) : null}
          {showHome ? (
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Go Home
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

