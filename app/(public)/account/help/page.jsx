'use client'

import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";

export default function HelpCenterPage() {
  const router = useRouter();

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-3xl mx-auto py-10">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">Help Centre</h1>
        <p className="mt-2 text-slate-500">Get support for payments, orders, refunds, and account access.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <a href="tel:+911234567890" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
            <Phone size={18} className="text-indigo-500" />
            <p className="mt-3 font-medium text-slate-800">Call Support</p>
            <p className="text-sm text-slate-500">+91 12345 67890</p>
          </a>
          <a href="mailto:support@thriftstore.com?subject=Help%20Request" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
            <Mail size={18} className="text-indigo-500" />
            <p className="mt-3 font-medium text-slate-800">Email Support</p>
            <p className="text-sm text-slate-500">support@thriftstore.com</p>
          </a>
          <a href="https://wa.me/911234567890" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
            <MessageCircle size={18} className="text-indigo-500" />
            <p className="mt-3 font-medium text-slate-800">WhatsApp</p>
            <p className="text-sm text-slate-500">Chat with support</p>
          </a>
        </div>
      </div>
    </div>
  );
}
