'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

const STORAGE_KEY = "tsm_bank_upi_details";

export default function BankUpiPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setForm((prev) => ({ ...prev, ...parsed }));
    } catch {}
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = (e) => {
    e.preventDefault();
    if (!form.accountHolder.trim() || !form.accountNumber.trim() || !form.ifsc.trim() || !form.upiId.trim()) {
      toast.error("Please fill all fields.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    toast.success("Bank & UPI details saved.");
  };

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-2xl mx-auto py-10">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">Bank & UPI Details</h1>
        <p className="mt-2 text-slate-500">Save payout details for refunds and settlements.</p>

        <form onSubmit={onSave} className="mt-7 space-y-4 rounded-xl border border-slate-200 p-5">
          <input name="accountHolder" value={form.accountHolder} onChange={onChange} placeholder="Account Holder Name" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none" />
          <input name="accountNumber" value={form.accountNumber} onChange={onChange} placeholder="Account Number" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none" />
          <input name="ifsc" value={form.ifsc} onChange={onChange} placeholder="IFSC Code" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none uppercase" />
          <input name="upiId" value={form.upiId} onChange={onChange} placeholder="UPI ID (example@upi)" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none" />
          <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-5 py-2.5">Save Details</button>
        </form>
      </div>
    </div>
  );
}
