'use client'

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState("");
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("UPI");

  useEffect(() => {
    const fetchWallet = async () => {
      const response = await fetch("/api/wallet", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to load wallet.");
      }
      setBalance(Number(payload?.data?.balance || 0));
      setTxns(payload?.data?.transactions || []);
      setLoading(false);
    };

    fetchWallet().catch((error) => {
      toast.error(error?.message || "Failed to load wallet.");
      setLoading(false);
    });
  }, []);

  const addMoney = async (amount) => {
    const response = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      toast.error(payload?.message || "Failed to credit wallet.");
      return;
    }
    toast.success(`Added Rs${amount} to wallet.`);
    const refresh = await fetch("/api/wallet", { cache: "no-store" });
    const refreshPayload = await refresh.json();
    if (refresh.ok && refreshPayload?.success) {
      setBalance(Number(refreshPayload?.data?.balance || 0));
      setTxns(refreshPayload?.data?.transactions || []);
    }
  };

  const currency = useMemo(() => process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "Rs", []);

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-3xl mx-auto py-10">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">Thrift Balance</h1>
        <p className="mt-2 text-slate-500">Use wallet balance for faster checkout.</p>

        <div className="mt-6 rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Available Balance</p>
          <p className="mt-1 text-3xl font-semibold text-slate-800">{currency}{balance}</p>
          <div className="mt-4 flex gap-2">
            {[100, 250, 500].map((amount) => (
              <button key={amount} type="button" onClick={() => addMoney(amount)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                + {currency}{amount}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowTopupModal(true)}
            className="mt-4 rounded-lg bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-900"
          >
            Add Custom Amount
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800">Recent Transactions</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading transactions...</p>
          ) : txns.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {txns.slice(0, 10).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{txn.reason || "Wallet Activity"}</span>
                  <span className={`font-medium ${String(txn.type).toUpperCase() === "DEBIT" ? "text-red-500" : "text-emerald-600"}`}>
                    {String(txn.type).toUpperCase() === "DEBIT" ? "-" : "+"}
                    {currency}{Number(txn.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">Mock Wallet Top‑up</h3>
            <p className="mt-1 text-xs text-slate-500">Simulate a top‑up without paid gateway.</p>

            <input
              type="number"
              min="1"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="Enter amount"
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
            />

            <div className="mt-4 space-y-2">
              {["UPI", "CARD", "NETBANKING"].map((method) => (
                <label key={method} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 cursor-pointer">
                  <input
                    type="radio"
                    name="topupMethod"
                    checked={selectedMethod === method}
                    onChange={() => setSelectedMethod(method)}
                  />
                  <span className="text-slate-700">{method}</span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTopupModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const amount = Number(topupAmount);
                  if (!Number.isFinite(amount) || amount <= 0) {
                    toast.error("Enter a valid amount.");
                    return;
                  }
                  toast.promise(addMoney(amount), {
                    loading: "Processing top‑up...",
                    success: `Wallet credited via ${selectedMethod}.`,
                    error: (err) => err?.message || "Top‑up failed.",
                  });
                  setShowTopupModal(false);
                  setTopupAmount("");
                }}
                className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-900"
              >
                Simulate Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
