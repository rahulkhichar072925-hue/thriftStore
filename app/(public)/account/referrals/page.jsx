'use client'

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Share2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ReferralPage() {
  const router = useRouter();
  const { user, isSignedIn } = useUser();

  const referralLink =
    isSignedIn && user?.id
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${encodeURIComponent(user.id)}`
      : "";

  const handleShare = async () => {
    if (!referralLink) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join ThriftStore",
          text: "Use my referral link and start shopping.",
          url: referralLink,
        });
      } else {
        await navigator.clipboard.writeText(referralLink);
      }
      toast.success("Referral shared successfully.");
    } catch {
      toast.error("Unable to share referral.");
    }
  };

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied.");
  };

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-3xl mx-auto py-10">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">Refer & Earn</h1>
        <p className="mt-2 text-slate-500">Share your referral with friends and earn rewards.</p>

        {isSignedIn ? (
          <div className="mt-6 rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Your Referral Link</p>
            <p className="mt-1 text-slate-800 break-all">{referralLink}</p>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2">
                <Copy size={16} />
                Copy
              </button>
              <button type="button" onClick={handleShare} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-4 py-2">
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-slate-600">Please sign in to generate your referral link.</p>
        )}
      </div>
    </div>
  );
}
