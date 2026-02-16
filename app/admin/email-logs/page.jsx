'use client'

import { useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function AdminEmailLogs() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState("")
    const [eventType, setEventType] = useState("")

    useEffect(() => {
        const fetchLogs = async () => {
            const params = new URLSearchParams()
            if (status) params.set("status", status)
            if (eventType) params.set("eventType", eventType)
            const response = await fetch(`/api/admin/email-logs?${params.toString()}`, { cache: "no-store" })
            const payload = await response.json()
            if (!response.ok || !payload?.success) throw new Error(payload?.message || "Failed to load email logs.")
            setLogs(payload?.data || [])
            setLoading(false)
        }

        setLoading(true)
        fetchLogs().catch((error) => {
            toast.error(error?.message || "Failed to load email logs.")
            setLoading(false)
        })
    }, [status, eventType])

    return (
        <div className="text-slate-500">
            <div className="mb-5 flex items-start justify-between gap-3 max-md:flex-col">
                <h1 className="text-2xl">Email <span className="text-slate-800 font-medium">Logs</span></h1>
                <div className="flex gap-2 w-full md:w-auto max-sm:flex-col">
                    <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="rounded border border-slate-300 px-3 py-2 text-sm w-full md:w-56"
                    >
                        <option value="">All Events</option>
                        <option value="STORE_REQUEST_STATUS">STORE_REQUEST_STATUS</option>
                        <option value="ORDER_PLACED">ORDER_PLACED</option>
                        <option value="ORDER_STATUS_UPDATED">ORDER_STATUS_UPDATED</option>
                        <option value="COMPLAINT_STATUS_UPDATED">COMPLAINT_STATUS_UPDATED</option>
                        <option value="GENERAL">GENERAL</option>
                    </select>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="rounded border border-slate-300 px-3 py-2 text-sm w-full md:w-44"
                    >
                        <option value="">All Status</option>
                        <option value="SENT">SENT</option>
                        <option value="FAILED">FAILED</option>
                        <option value="SKIPPED">SKIPPED</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            setStatus("")
                            setEventType("")
                        }}
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        disabled={loading || logs.length === 0}
                        onClick={() => {
                            const headers = ["Recipient", "Subject", "Event", "Status", "Error", "Date"]
                            const escapeCsv = (value) =>
                                `"${String(value ?? "").replaceAll('"', '""')}"`
                            const rows = logs.map((log) => [
                                log.recipient,
                                log.subject,
                                log.eventType,
                                log.status,
                                log.error || "",
                                new Date(log.createdAt).toISOString(),
                            ])
                            const csv = [headers, ...rows]
                                .map((row) => row.map(escapeCsv).join(","))
                                .join("\n")

                            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                            const url = URL.createObjectURL(blob)
                            const link = document.createElement("a")
                            link.href = url
                            link.download = `email-logs-${new Date().toISOString().slice(0, 10)}.csv`
                            document.body.appendChild(link)
                            link.click()
                            link.remove()
                            URL.revokeObjectURL(url)
                        }}
                        className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto max-w-6xl rounded-md shadow border border-gray-200 mt-5">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                        <tr>
                            {["Recipient", "Subject", "Event", "Status", "Error", "Date"].map((heading, i) => (
                                <th key={i} className="px-4 py-3">{heading}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? Array.from({ length: 8 }).map((_, i) => (
                            <tr key={`skeleton-${i}`}>
                                <td className="px-4 py-3" colSpan={6}>
                                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                                </td>
                            </tr>
                        )) : logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-4 py-3">{log.recipient}</td>
                                <td className="px-4 py-3">{log.subject}</td>
                                <td className="px-4 py-3">{log.eventType}</td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${log.status === "SENT"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : log.status === "FAILED"
                                                ? "bg-rose-100 text-rose-700"
                                                : "bg-amber-100 text-amber-700"
                                            }`}
                                    >
                                        {log.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500 max-w-52 truncate">{log.error || "-"}</td>
                                <td className="px-4 py-3 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                        {!loading && logs.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No email logs found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
