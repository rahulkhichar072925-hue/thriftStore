'use client'

import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

const plans = [
  {
    id: "basic",
    title: "Basic",
    price: "Rs0",
    period: "/month",
    description: "Standard shopping access with regular offers.",
    features: ["Shop all products", "Track orders", "Use public coupons"],
  },
  {
    id: "plus",
    title: "Plus",
    price: "Rs199",
    period: "/month",
    description: "Unlock premium plus badge and exclusive coupons.",
    features: ["Plus badge on logo", "Priority support", "Exclusive plus coupons"],
  },
];

export default function PricingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const [activePlan, setActivePlan] = useState("basic");
  const [activeCycle, setActiveCycle] = useState("monthly");
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("monthly");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");

  const fetchMembership = async () => {
    const response = await fetch("/api/membership", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || "Failed to load membership plan.");
    }

    setActivePlan(payload?.data?.plan === "plus" ? "plus" : "basic");
    setActiveCycle(payload?.data?.cycle === "yearly" ? "yearly" : "monthly");
    setExpiresAt(payload?.data?.expiresAt || null);
    setLoading(false);
  };

  const updatePlan = async (planId, cycle = selectedCycle) => {
    if (!isSignedIn) {
      openSignIn?.({
        forceRedirectUrl: "/pricing",
        fallbackRedirectUrl: "/pricing",
      });
      return;
    }

    setSavingPlan(planId);
    try {
      const response = await fetch("/api/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          cycle,
          paymentMethod: planId === "plus" ? paymentMethod : "none",
          paymentStatus: planId === "plus" ? "paid" : "none",
          transactionId: planId === "plus" ? `TSM-${Date.now()}` : "",
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to update membership.");
      }

      setActivePlan(planId);
      setActiveCycle(cycle === "yearly" ? "yearly" : "monthly");
      setExpiresAt(payload?.data?.expiresAt || null);
      await user?.reload?.();
      toast.success(payload?.message || "Membership updated.");
    } catch (error) {
      toast.error(error?.message || "Failed to update membership.");
    } finally {
      setSavingPlan("");
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setActivePlan("basic");
      setLoading(false);
      return;
    }

    fetchMembership().catch((error) => {
      toast.error(error?.message || "Failed to load pricing.");
      setLoading(false);
    });
  }, [isLoaded, isSignedIn]);

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  };

  const handlePlusPayment = async () => {
    await updatePlan("plus", selectedCycle);
    setPaymentModalOpen(false);
  };

  if (loading) {
    return <div className="mx-auto max-w-[1100px] my-20 px-6 text-slate-500">Loading pricing...</div>;
  }

  return (
    <div className="mx-auto max-w-[1100px] my-20 px-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-slate-800">Choose Your Membership</h1>
        <p className="mt-3 text-slate-500">Activate Plus to unlock premium benefits across your account.</p>
        {activePlan === "plus" && (
          <p className="mt-2 text-sm text-emerald-700">
            Current Plus plan: {activeCycle} | Expires on {formatDate(expiresAt)}
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedCycle("monthly")}
          className={`px-4 py-2 rounded-lg border ${selectedCycle === "monthly" ? "bg-slate-800 text-white border-slate-800" : "border-slate-300 text-slate-600"}`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setSelectedCycle("yearly")}
          className={`px-4 py-2 rounded-lg border ${selectedCycle === "yearly" ? "bg-slate-800 text-white border-slate-800" : "border-slate-300 text-slate-600"}`}
        >
          Yearly
        </button>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const isActive = activePlan === plan.id;
          const isSaving = savingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 shadow-sm transition ${
                isActive ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-slate-800">{plan.title}</h2>
                {isActive && (
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">Active</span>
                )}
              </div>

              <p className="mt-3 text-slate-500">{plan.description}</p>
              <p className="mt-5 text-3xl font-semibold text-slate-900">
                {plan.price}
                <span className="text-base font-normal text-slate-500">{plan.period}</span>
              </p>

              <ul className="mt-5 space-y-2 text-slate-600 text-sm">
                {plan.features.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>

              <button
                type="button"
                disabled={isActive || isSaving}
                onClick={() => {
                  if (plan.id === "plus") {
                    setPaymentModalOpen(true);
                    return;
                  }
                  updatePlan(plan.id, "monthly");
                }}
                className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "cursor-not-allowed bg-slate-200 text-slate-500"
                    : "bg-slate-800 text-white hover:bg-slate-900"
                }`}
              >
                {isSaving ? "Updating..." : isActive ? "Current Plan" : `Switch to ${plan.title}`}
              </button>
            </div>
          );
        })}
      </div>

      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">Complete Plus Payment</h3>
            <p className="mt-1 text-sm text-slate-500">
              Plan: Plus ({selectedCycle}) | Amount: {selectedCycle === "yearly" ? "Rs1990" : "Rs199"}
            </p>

            <div className="mt-4 space-y-2">
              {["upi", "card", "netbanking"].map((method) => (
                <label key={method} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                  />
                  <span className="text-slate-700 uppercase">{method}</span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPlan === "plus"}
                onClick={() => {
                  toast.promise(handlePlusPayment(), {
                    loading: "Processing payment...",
                    success: "Payment successful. Plus activated.",
                    error: (err) => err?.message || "Payment failed.",
                  });
                }}
                className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-900 disabled:opacity-60"
              >
                Pay & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
