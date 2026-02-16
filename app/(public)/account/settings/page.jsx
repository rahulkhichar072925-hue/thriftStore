'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { openUserProfile } = useClerk();
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-2xl mx-auto py-10">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">Settings</h1>
        <p className="mt-2 text-slate-500">Manage your account and app preferences.</p>

        <div className="mt-6 rounded-xl border border-slate-200 divide-y divide-slate-200">
          <button
            type="button"
            onClick={() => openUserProfile?.()}
            className="w-full text-left px-4 py-4 hover:bg-slate-50"
          >
            <p className="font-medium text-slate-800">Edit Profile</p>
            <p className="text-sm text-slate-500">Update name, email, and password in Clerk account.</p>
          </button>

          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Order Notifications</p>
              <p className="text-sm text-slate-500">Get updates for order and delivery events.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !notifications;
                setNotifications(next);
                toast.success(`Notifications ${next ? "enabled" : "disabled"}.`);
              }}
              className={`w-11 h-6 rounded-full transition ${notifications ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span className={`block size-5 rounded-full bg-white transition ${notifications ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
