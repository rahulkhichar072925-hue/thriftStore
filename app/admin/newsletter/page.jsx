'use client'

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";

export default function AdminNewsletterPage() {
    const [loading, setLoading] = useState(true);
    const [subscribers, setSubscribers] = useState([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchSubscribers = async () => {
            const response = await fetch("/api/admin/newsletter", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to fetch subscribers.");
            }

            setSubscribers(payload?.data || []);
            setLoading(false);
        };

        fetchSubscribers().catch((error) => {
            toast.error(error?.message || "Failed to load newsletter subscribers.");
            setLoading(false);
        });
    }, []);

    const filteredSubscribers = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return subscribers;
        return subscribers.filter((item) => String(item.email || "").toLowerCase().includes(query));
    }, [subscribers, search]);

    if (loading) return <Loading />;

    return (
        <div className="text-slate-600 mb-40">
            <div className="flex items-start justify-between gap-4 max-sm:flex-col">
                <div>
                    <h2 className="text-2xl">Newsletter <span className="text-slate-800 font-medium">Subscribers</span></h2>
                    <p className="text-sm text-slate-500 mt-1">Total subscribers: {subscribers.length}</p>
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by email"
                    className="w-full max-w-xs border border-slate-300 rounded-md px-3 py-2 text-sm outline-slate-400"
                />
            </div>

            <div className="overflow-x-auto mt-5 rounded-lg border border-slate-200 max-w-4xl">
                <table className="min-w-full bg-white text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">#</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Email</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Subscribed At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredSubscribers.map((subscriber, index) => (
                            <tr key={subscriber.id} className="hover:bg-slate-50">
                                <td className="py-3 px-4 text-slate-800">{index + 1}</td>
                                <td className="py-3 px-4 text-slate-800">{subscriber.email}</td>
                                <td className="py-3 px-4 text-slate-800">{new Date(subscriber.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                        {filteredSubscribers.length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-6 px-4 text-center text-slate-400">No subscribers found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
