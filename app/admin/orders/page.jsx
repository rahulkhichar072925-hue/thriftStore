'use client'
import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const ORDER_FLOW = ["ORDER_PLACED", "PROCESSING", "SHIPPED", "DELIVERED"]
const getSelectableStatuses = (currentStatus) => {
    const current = String(currentStatus || "").toUpperCase()
    const index = ORDER_FLOW.indexOf(current)
    if (index === -1) return [ORDER_FLOW[0]]
    return ORDER_FLOW.slice(index, Math.min(index + 2, ORDER_FLOW.length))
}

export default function AdminOrders() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "Rs"
    const router = useRouter()
    const pathname = usePathname()
    const query = useSearchParams()
    const initialPage = Math.max(1, Number.parseInt(query.get("page") || "1", 10) || 1)
    const initialSearch = query.get("search") || ""
    const initialStatus = query.get("status") || ""
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(initialPage)
    const [totalPages, setTotalPages] = useState(1)
    const [searchInput, setSearchInput] = useState(initialSearch)
    const [search, setSearch] = useState(initialSearch)
    const [status, setStatus] = useState(initialStatus)
    const hasMountedRef = useRef(false)

    const fetchOrders = async () => {
        const params = new URLSearchParams()
        params.set("page", String(page))
        params.set("pageSize", "12")
        if (search.trim()) params.set("search", search.trim())
        if (status) params.set("status", status)

        const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to fetch orders.")
        }
        setOrders(payload?.data || [])
        setTotalPages(payload?.pagination?.totalPages || 1)
        setLoading(false)
    }

    const updateOrderStatus = async (orderId, statusValue) => {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: statusValue }),
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to update status.")
        }
        setOrders((prev) => prev.map((order) => (order.id === orderId ? payload.data : order)))
        return payload?.message || "Order status updated."
    }

    useEffect(() => {
        setLoading(true)
        fetchOrders().catch((error) => {
            toast.error(error?.message || "Failed to load orders.")
            setLoading(false)
        })
    }, [page, search, status])

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput)
        }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    useEffect(() => {
        const params = new URLSearchParams()
        if (page > 1) params.set("page", String(page))
        if (search.trim()) params.set("search", search.trim())
        if (status) params.set("status", status)
        const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
        router.replace(nextUrl, { scroll: false })
    }, [page, search, status, pathname, router])

    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true
            return
        }
        setPage(1)
    }, [search, status])

    return (
        <div className="text-slate-500 mb-28">
            <div className="flex items-start justify-between gap-3 max-md:flex-col">
                <h1 className="text-2xl">All <span className="text-slate-800 font-medium">Orders</span></h1>
                <div className="flex gap-2 w-full md:w-auto max-sm:flex-col">
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by order/customer/store"
                        className="rounded border border-slate-300 px-3 py-2 text-sm w-full md:w-64"
                    />
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="rounded border border-slate-300 px-3 py-2 text-sm w-full md:w-44"
                    >
                        <option value="">All Status</option>
                        <option value="ORDER_PLACED">ORDER_PLACED</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchInput("")
                            setSearch("")
                            setStatus("")
                            setPage(1)
                        }}
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {!loading && orders.length === 0 ? (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No Orders Found</h1>
                </div>
            ) : (
                <div className="overflow-x-auto max-w-6xl rounded-md shadow border border-gray-200 mt-5">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                                {["Order", "Customer", "Store", "Total", "Payment", "Status", "Date"].map((heading, i) => (
                                    <th key={i} className="px-4 py-3">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? Array.from({ length: 8 }).map((_, i) => (
                                <tr key={`skeleton-${i}`}>
                                    <td className="px-4 py-3" colSpan={7}>
                                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                                    </td>
                                </tr>
                            )) : orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-4 py-3 font-medium text-slate-700">{order.id.slice(0, 10)}...</td>
                                    <td className="px-4 py-3">{order.user?.name}</td>
                                    <td className="px-4 py-3">{order.store?.name}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{currency}{order.total}</td>
                                    <td className="px-4 py-3">{order.paymentMethod}</td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const allowed = getSelectableStatuses(order.status)
                                            return (
                                        <select
                                            value={order.status}
                                            onChange={(e) => toast.promise(updateOrderStatus(order.id, e.target.value), {
                                                loading: "Updating status...",
                                                success: (msg) => msg || "Order status updated.",
                                                error: (err) => err?.message || "Failed to update status.",
                                            })}
                                            className="border-gray-300 rounded-md text-sm focus:ring focus:ring-blue-200"
                                        >
                                            {ORDER_FLOW.map((statusValue) => (
                                                <option
                                                    key={statusValue}
                                                    value={statusValue}
                                                    disabled={!allowed.includes(statusValue)}
                                                >
                                                    {statusValue}
                                                </option>
                                            ))}
                                        </select>
                                            )
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{new Date(order.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                    Prev
                </button>
                <span>Page {page} / {totalPages}</span>
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    )
}
