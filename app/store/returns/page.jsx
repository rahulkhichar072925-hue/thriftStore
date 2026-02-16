'use client'

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import ReturnsCalendar from "@/components/ReturnsCalendar";

const STATUS_OPTIONS = ["REQUESTED", "APPROVED", "PICKED_UP", "REFUNDED", "REJECTED"];

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export default function StoreReturnsPage() {
    const { isLoaded, isSignedIn, user } = useUser();
    const [loading, setLoading] = useState(true);
    const [returns, setReturns] = useState([]);
    const [search, setSearch] = useState("");
    const [noteDrafts, setNoteDrafts] = useState({});
    const [pickupDrafts, setPickupDrafts] = useState({});
    const [updatingId, setUpdatingId] = useState("");
    const [activeSchedule, setActiveSchedule] = useState(null);
    const [viewMode, setViewMode] = useState("table");

    const fetchReturns = async (silent = false) => {
        if (!isLoaded) return;
        if (!isSignedIn || !user?.id) {
            setLoading(false);
            setReturns([]);
            return;
        }

        try {
            const response = await fetch(`/api/store/returns?userId=${encodeURIComponent(user.id)}`, {
                cache: "no-store",
            });
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to fetch returns.");
            }

            setReturns(payload?.data || []);
            setNoteDrafts(
                (payload?.data || []).reduce((acc, item) => {
                    acc[item.id] = item.adminNote || "";
                    return acc;
                }, {})
            );
            setPickupDrafts(
                (payload?.data || []).reduce((acc, item) => {
                    acc[item.id] = {
                        pickupDate: item.pickupDate ? new Date(item.pickupDate).toISOString().slice(0, 16) : "",
                        pickupWindow: item.pickupWindow || "",
                        pickupAddress: item.pickupAddress || "",
                        pickupNote: item.pickupNote || "",
                    };
                    return acc;
                }, {})
            );
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
    }, [isLoaded, isSignedIn, user?.id]);

    useEffect(() => {
        const handleRefresh = () => fetchReturns(true);
        window.addEventListener("tsm_returns_refresh", handleRefresh);
        return () => window.removeEventListener("tsm_returns_refresh", handleRefresh);
    }, [isLoaded, isSignedIn, user?.id]);

    const filteredReturns = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return returns;
        return returns.filter((item) => {
            const haystack = [
                item?.reason,
                item?.description,
                item?.product?.name,
                item?.user?.email,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [returns, search]);

    const updateReturn = async (returnId, status) => {
        if (!user?.id) return;
        setUpdatingId(returnId);
        try {
            const response = await fetch(`/api/store/returns/${returnId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    status,
                    adminNote: noteDrafts[returnId] || "",
                    ...(pickupDrafts[returnId] || {}),
                }),
            });
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to update return.");
            }

            setReturns((prev) => prev.map((item) => (item.id === returnId ? payload.data : item)));
            window.dispatchEvent(new Event("tsm_returns_refresh"));
            toast.success("Return updated.");
        } catch (error) {
            toast.error(error?.message || "Failed to update return.");
        } finally {
            setUpdatingId("");
        }
    };

    const exportReturnsCsv = (rows) => {
        const header = [
            "id",
            "status",
            "product",
            "customerEmail",
            "reason",
            "createdAt",
            "refundAmount",
            "pickupDate",
            "pickupWindow",
            "pickupAddress",
            "note",
        ];
        const csv = [header.join(",")]
            .concat(
                rows.map((item) =>
                    [
                        item.id,
                        item.status,
                        escapeCsv(item.product?.name || ""),
                        escapeCsv(item.user?.email || ""),
                        escapeCsv(item.reason || ""),
                        escapeCsv(item.createdAt || ""),
                        item.refundAmount ?? "",
                        escapeCsv(item.pickupDate || ""),
                        escapeCsv(item.pickupWindow || ""),
                        escapeCsv(item.pickupAddress || ""),
                        escapeCsv(noteDrafts[item.id] ?? item.adminNote ?? ""),
                    ].join(",")
                )
            )
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `returns-store-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) return <Loading />;

    return (
        <div className="text-slate-600 mb-40">
            <div className="flex items-start justify-between gap-4 max-sm:flex-col">
                <div>
                    <h2 className="text-2xl">Customer <span className="text-slate-800 font-medium">Returns</span></h2>
                    <p className="text-sm text-slate-500 mt-1">Total returns: {returns.length}</p>
                </div>
                <div className="flex items-center gap-3 w-full max-w-xl">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`rounded-md px-3 py-2 text-xs border ${viewMode === "table" ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600"}`}
                        >
                            Table
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
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search returns"
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-slate-400"
                    />
                    {viewMode === "table" && (
                        <button
                            type="button"
                            onClick={() => exportReturnsCsv(filteredReturns)}
                            className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                            Export CSV
                        </button>
                    )}
                </div>
            </div>

            {viewMode === "calendar" ? (
                <div className="mt-6">
                    <ReturnsCalendar returnsList={returns} />
                </div>
            ) : (
            <div className="overflow-x-auto mt-5 rounded-lg border border-slate-200">
                <table className="min-w-full bg-white text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Product</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Reason</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Customer</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Note</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Status</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Refund</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Pickup</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredReturns.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 align-top">
                                <td className="py-3 px-4 text-slate-800 min-w-48">
                                    <p className="font-medium">{item.product?.name || "Unknown Product"}</p>
                                    <p className="text-xs text-slate-500 mt-1">Order: {item.orderId}</p>
                                </td>
                                <td className="py-3 px-4 text-slate-800 min-w-64">
                                    <p className="font-medium">{item.reason}</p>
                                    <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                                </td>
                                <td className="py-3 px-4 text-slate-800 min-w-44">
                                    <p>{item.user?.name || "User"}</p>
                                    <p className="text-xs text-slate-500">{item.user?.email}</p>
                                </td>
                                <td className="py-3 px-4 min-w-64">
                                    <textarea
                                        rows={3}
                                        value={noteDrafts[item.id] ?? ""}
                                        onChange={(e) =>
                                            setNoteDrafts((prev) => ({
                                                ...prev,
                                                [item.id]: e.target.value,
                                            }))
                                        }
                                        className="w-full resize-none rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                                        placeholder="Add response note"
                                    />
                                </td>
                                <td className="py-3 px-4 min-w-44">
                                    <select
                                        value={item.status}
                                        onChange={(e) => updateReturn(item.id, e.target.value)}
                                        disabled={updatingId === item.id}
                                        className="w-full rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                                    >
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>
                                                {status.replace(/_/g, " ")}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="py-3 px-4 min-w-28 text-sm text-slate-700">
                                    {item.refundAmount ? `Rs${Number(item.refundAmount).toLocaleString()}` : "-"}
                                </td>
                                <td className="py-3 px-4 min-w-36 text-sm text-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setActiveSchedule(item)}
                                        className="text-blue-600 hover:underline"
                                    >
                                        {item.pickupDate ? "Edit Pickup" : "Schedule Pickup"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredReturns.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-6 px-4 text-center text-slate-400">No return requests found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            )}
            {activeSchedule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-800">Schedule Pickup</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {activeSchedule.product?.name || "Product"} | Order {activeSchedule.orderId}
                        </p>
                        <div className="mt-4 space-y-3">
                            <input
                                type="datetime-local"
                                value={pickupDrafts[activeSchedule.id]?.pickupDate || ""}
                                onChange={(e) =>
                                    setPickupDrafts((prev) => ({
                                        ...prev,
                                        [activeSchedule.id]: {
                                            ...(prev[activeSchedule.id] || {}),
                                            pickupDate: e.target.value,
                                        },
                                    }))
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            />
                            <input
                                type="text"
                                value={pickupDrafts[activeSchedule.id]?.pickupWindow || ""}
                                onChange={(e) =>
                                    setPickupDrafts((prev) => ({
                                        ...prev,
                                        [activeSchedule.id]: {
                                            ...(prev[activeSchedule.id] || {}),
                                            pickupWindow: e.target.value,
                                        },
                                    }))
                                }
                                placeholder="Pickup time window (e.g. 10am - 1pm)"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            />
                            <textarea
                                value={pickupDrafts[activeSchedule.id]?.pickupAddress || ""}
                                onChange={(e) =>
                                    setPickupDrafts((prev) => ({
                                        ...prev,
                                        [activeSchedule.id]: {
                                            ...(prev[activeSchedule.id] || {}),
                                            pickupAddress: e.target.value,
                                        },
                                    }))
                                }
                                placeholder="Pickup address"
                                rows={3}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            />
                            <textarea
                                value={pickupDrafts[activeSchedule.id]?.pickupNote || ""}
                                onChange={(e) =>
                                    setPickupDrafts((prev) => ({
                                        ...prev,
                                        [activeSchedule.id]: {
                                            ...(prev[activeSchedule.id] || {}),
                                            pickupNote: e.target.value,
                                        },
                                    }))
                                }
                                placeholder="Pickup note (optional)"
                                rows={2}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                            />
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveSchedule(null)}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    updateReturn(activeSchedule.id, activeSchedule.status);
                                    setActiveSchedule(null);
                                }}
                                className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                            >
                                Save Pickup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
