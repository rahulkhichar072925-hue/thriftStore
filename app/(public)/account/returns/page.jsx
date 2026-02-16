'use client'

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ReturnsCalendar from "@/components/ReturnsCalendar";
import toast from "react-hot-toast";

const STATUS_LABELS = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  PICKED_UP: "Picked Up",
  REFUNDED: "Refunded",
  REJECTED: "Rejected",
};

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export default function AccountReturnsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");

  const fetchReturns = async (silent = false) => {
    try {
      const response = await fetch("/api/returns", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to fetch returns.");
      }
      setReturns(payload?.data || []);
    } catch (error) {
      if (!silent) {
        toast.error(error?.message || "Failed to load returns.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  useEffect(() => {
    const handleRefresh = () => fetchReturns(true);
    window.addEventListener("tsm_returns_refresh", handleRefresh);
    return () => window.removeEventListener("tsm_returns_refresh", handleRefresh);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return returns;
    return returns.filter((item) => {
      const haystack = [
        item?.product?.name,
        item?.reason,
        item?.description,
        item?.status,
        item?.store?.name,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [returns, search]);

  const exportReturnsCsv = (rows) => {
    const header = [
      "id",
      "status",
      "product",
      "store",
      "reason",
      "createdAt",
      "refundAmount",
      "pickupDate",
      "pickupWindow",
      "pickupAddress",
    ];
    const csv = [header.join(",")]
      .concat(
        rows.map((item) =>
          [
            item.id,
            item.status,
            escapeCsv(item.product?.name || ""),
            escapeCsv(item.store?.name || ""),
            escapeCsv(item.reason || ""),
            escapeCsv(item.createdAt || ""),
            item.refundAmount ?? "",
            escapeCsv(item.pickupDate || ""),
            escapeCsv(item.pickupWindow || ""),
            escapeCsv(item.pickupAddress || ""),
          ].join(",")
        )
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `returns-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="mx-6 min-h-[70vh] flex items-center justify-center text-slate-500">
        Loading returns...
      </div>
    );
  }

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-4xl mx-auto py-10">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">My Returns</h1>
        <p className="mt-2 text-slate-500">Track the status of your return requests.</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-md px-3 py-2 text-xs border ${viewMode === "list" ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600"}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`rounded-md px-3 py-2 text-xs border ${viewMode === "calendar" ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600"}`}
            >
              Calendar
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search returns"
            className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
          />
          {viewMode === "list" && (
            <button
              type="button"
              onClick={() => exportReturnsCsv(filtered)}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </button>
          )}
        </div>

        {viewMode === "calendar" ? (
          <div className="mt-6">
            <ReturnsCalendar returnsList={returns} />
          </div>
        ) : (
        <div className="mt-6 space-y-4">
          {filtered.map((item) => {
            const timeline = Array.isArray(item.statusTimeline) ? item.statusTimeline : [];
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{item.product?.name || "Product"}</p>
                    <p className="text-sm text-slate-500">{item.store?.name || "Store"}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="text-xs rounded-full bg-slate-100 text-slate-700 px-2 py-1">
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600"><strong>Reason:</strong> {item.reason}</p>
                <p className="text-sm text-slate-500">{item.description}</p>
                {item.refundAmount ? (
                  <p className="mt-2 text-sm text-emerald-700">Refund: Rs{Number(item.refundAmount).toLocaleString()}</p>
                ) : null}
                {(item.pickupDate || item.pickupWindow || item.pickupAddress) && (
                  <div className="mt-2 text-sm text-slate-600">
                    {item.pickupDate ? (
                      <p><strong>Pickup:</strong> {new Date(item.pickupDate).toLocaleString()}</p>
                    ) : null}
                    {item.pickupWindow ? <p><strong>Window:</strong> {item.pickupWindow}</p> : null}
                    {item.pickupAddress ? <p><strong>Address:</strong> {item.pickupAddress}</p> : null}
                    {item.pickupNote ? <p><strong>Note:</strong> {item.pickupNote}</p> : null}
                  </div>
                )}

                {timeline.length > 0 && (
                  <div className="mt-4 grid sm:grid-cols-5 gap-2">
                    {timeline.map((step, index) => (
                      <div key={`${step.status}-${index}`} className="rounded-md border border-slate-200 p-2 text-center text-xs">
                        <p className="font-medium text-slate-700">{STATUS_LABELS[step.status] || step.status}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{step.at ? new Date(step.at).toLocaleString() : "-"}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/account/returns/receipt/${item.id}`)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    View Receipt
                  </button>
                  <a
                    href={`/api/returns/${item.id}/receipt`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-slate-500">No returns found.</p>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
