'use client'

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";

export default function AdminAuditLogsPage() {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const loadLogs = async () => {
            const response = await fetch("/api/admin/audit-logs", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to load audit logs.");
            }
            setLogs(payload?.data || []);
            setLoading(false);
        };

        loadLogs().catch((error) => {
            toast.error(error?.message || "Failed to load audit logs.");
            setLoading(false);
        });
    }, []);

    const filteredLogs = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return logs;
        return logs.filter((log) =>
            [
                log?.action,
                log?.targetType,
                log?.targetId,
                log?.adminUserId,
                JSON.stringify(log?.details || {}),
            ]
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [logs, search]);

    if (loading) return <Loading />;

    return (
        <div className="text-slate-600 mb-28">
            <div className="flex items-start justify-between gap-4 max-sm:flex-col">
                <div>
                    <h1 className="text-2xl">Admin <span className="text-slate-800 font-medium">Audit Logs</span></h1>
                    <p className="text-sm text-slate-500 mt-1">Recent admin actions: {logs.length}</p>
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search logs"
                    className="w-full max-w-xs border border-slate-300 rounded-md px-3 py-2 text-sm outline-slate-400"
                />
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full bg-white text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Time</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Action</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Target</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Admin User</th>
                            <th className="py-3 px-4 text-left font-semibold text-slate-600">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 align-top">
                                <td className="py-3 px-4 text-xs text-slate-700 min-w-40">{new Date(log.createdAt).toLocaleString()}</td>
                                <td className="py-3 px-4 text-xs font-semibold text-slate-800 min-w-44">{log.action}</td>
                                <td className="py-3 px-4 text-xs text-slate-700 min-w-44">
                                    {log.targetType}: {log.targetId}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-700 min-w-44">{log.adminUserId}</td>
                                <td className="py-3 px-4 text-xs text-slate-600 min-w-80">
                                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(log.details || {}, null, 2)}</pre>
                                </td>
                            </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 px-4 text-center text-slate-400">No audit logs found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

