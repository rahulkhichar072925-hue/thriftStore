'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import toast from "react-hot-toast";

const STORAGE_KEY = "tsm_app_feedback";

export default function RatePage() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setRating(Number(parsed?.rating || 0));
      setComment(parsed?.comment || "");
    } catch {}
  }, []);

  const submit = () => {
    if (!rating) {
      toast.error("Please select a star rating.");
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ rating, comment: comment.trim(), updatedAt: new Date().toISOString() })
    );
    toast.success("Thanks for your feedback.");
  };

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-2xl mx-auto py-10">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">Rate ThriftStore</h1>
        <p className="mt-2 text-slate-500">Share your experience and help us improve.</p>

        <div className="mt-7 rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <button key={index} onClick={() => setRating(index + 1)} type="button">
                <Star size={28} className={rating >= index + 1 ? "text-amber-400 fill-amber-400" : "text-slate-300"} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
            className="mt-4 w-full border border-slate-300 rounded-lg p-3 outline-none"
            placeholder="Write your feedback..."
          />
          <button onClick={submit} type="button" className="mt-4 bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-slate-900">
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
