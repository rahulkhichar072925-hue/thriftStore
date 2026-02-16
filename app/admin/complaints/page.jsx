'use client'

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";

const STATUS_OPTIONS = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];

export default function AdminComplaintsPage() {
    const [loading, setLoading] = useState(true);
    const [complaints, setComplaints] = useState([]);
    const [search, setSearch] = useState("");
    const [noteDrafts, setNoteDrafts] = useState({});
    const [updatingId, setUpdatingId] = useState("");

    useEffect(() => {
        const fetchComplaints = async () => {
            const response = await fetch("/api/admin/complaints", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to fetch complaints.");
            }

            setComplaints(payload?.data || []);
            setNoteDrafts(
                (payload?.data || []).reduce((acc, complaint) => {
                    acc[complaint.id] = complaint.adminNote || "";
                    return acc;
                }, {})
            );
            setLoading(false);
        };

        fetchComplaints().catch((error) => {
            toast.error(error?.message || "Failed to load complaints.");
            setLoading(false);
        });
    }, []);

    const filteredComplaints = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return complaints;
        return complaints.filter((item) => {
            const haystack = [
                item?.subject,
                item?.description,
                item?.product?.name,
                item?.store?.name,
                item?.user?.email,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [complaints, search]);

    const updateComplaint = async (complaintId, status) => {
        setUpdatingId(complaintId);
        try {
            const response = await fetch(`/api/admin/complaints/${complaintId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status,
                    adminNote: noteDrafts[complaintId] || "",
                }),
            });
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to update complaint.");
            }

            setComplaints((prev) =>
                prev.map((item) => (item.id === complaintId ? payload.data : item))
            );
            toast.success("Complaint updated.");
        } catch (error) {
            toast.error(error?.message || "Failed to update complaint.");
        } finally {
            setUpdatingId("");
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="text-slate-600 mb-40">
            <div className="flex items-start justify-between gap-4 max-sm:flex-col">
                <div>
                    <h2 className="text-2xl">Customer <span className="text-slate-800 font-medium">Complaints</span></h2>
                    <p className="text-sm text-slate-500 mt-1">Total complaints: {complaints.length}</p>
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search complaints"
                    className="w-full max-w-xs border border-slate-300 rounded-md px-3 py-2 text-sm outline-slate-400"
                />
            </div>

            <div className="overflow-x-auto mt-5 rounded-lg border border-slate-200">
                <table className="min-w-full bg-white text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Product</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Issue</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">User</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Store</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Admin Note</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredComplaints.map((complaint) => (
                            <tr key={complaint.id} className="hover:bg-slate-50 align-top">
                                <td className="py-3 px-4 text-slate-800 min-w-48">
                                    <p className="font-medium">{complaint.product?.name || "Unknown Product"}</p>
                                    <p className="text-xs text-slate-500 mt-1">Order: {complaint.orderId}</p>
                                </td>
                                <td className="py-3 px-4 text-slate-800 min-w-64">
                                    <p className="font-medium">{complaint.subject}</p>
                                    <p className="text-xs text-slate-600 mt-1">{complaint.description}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">{new Date(complaint.createdAt).toLocaleString()}</p>
                                </td>
                                <td className="py-3 px-4 text-slate-800 min-w-44">
                                    <p>{complaint.user?.name || "User"}</p>
                                    <p className="text-xs text-slate-500">{complaint.user?.email}</p>
                                </td>
                                <td className="py-3 px-4 text-slate-800 min-w-44">
                                    <p>{complaint.store?.name || "-"}</p>
                                </td>
                                <td className="py-3 px-4 min-w-64">
                                    <textarea
                                        rows={3}
                                        value={noteDrafts[complaint.id] ?? ""}
                                        onChange={(e) =>
                                            setNoteDrafts((prev) => ({
                                                ...prev,
                                                [complaint.id]: e.target.value,
                                            }))
                                        }
                                        className="w-full resize-none rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                                        placeholder="Optional admin note"
                                    />
                                </td>
                                <td className="py-3 px-4 min-w-44">
                                    <select
                                        value={complaint.status}
                                        onChange={(e) => updateComplaint(complaint.id, e.target.value)}
                                        disabled={updatingId === complaint.id}
                                        className="w-full rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                                    >
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>
                                                {status.replace(/_/g, " ")}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                        {filteredComplaints.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-6 px-4 text-center text-slate-400">No complaints found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
