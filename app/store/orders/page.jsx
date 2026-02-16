'use client'
import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useUser } from "@clerk/nextjs"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const ORDER_FLOW = ["ORDER_PLACED", "PROCESSING", "SHIPPED", "DELIVERED"]
const getSelectableStatuses = (currentStatus) => {
    const current = String(currentStatus || "").toUpperCase()
    const index = ORDER_FLOW.indexOf(current)
    if (index === -1) return [ORDER_FLOW[0]]
    return ORDER_FLOW.slice(index, Math.min(index + 2, ORDER_FLOW.length))
}

export default function StoreOrders() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "Rs"
    const { isLoaded, isSignedIn, user } = useUser()
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
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)


    const fetchOrders = async () => {
        if (!user?.id) {
            setOrders([])
            setLoading(false)
            return
        }

        const params = new URLSearchParams()
        params.set("userId", user.id)
        params.set("page", String(page))
        params.set("pageSize", "12")
        if (search.trim()) params.set("search", search.trim())
        if (status) params.set("status", status)

        const response = await fetch(`/api/store/orders?${params.toString()}`, { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to fetch orders.")
        }
        setOrders(payload?.data || [])
        setTotalPages(payload?.pagination?.totalPages || 1)
        setLoading(false)
    }

    const updateOrderStatus = async (orderId, status) => {
        const response = await fetch(`/api/store/orders/${orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to update status.")
        }

        setOrders((prev) => prev.map((order) => (order.id === orderId ? payload.data : order)))
        setSelectedOrder((prev) => (prev && prev.id === orderId ? payload.data : prev))
        return payload?.message || "Order status updated."
    }

    const openModal = (order) => {
        setSelectedOrder(order)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setSelectedOrder(null)
        setIsModalOpen(false)
    }

    useEffect(() => {
        if (!isLoaded) return
        if (!isSignedIn) {
            setLoading(false)
            return
        }

        setLoading(true)
        fetchOrders().catch((error) => {
            toast.error(error?.message || "Failed to load orders.")
            setLoading(false)
        })
    }, [isLoaded, isSignedIn, user?.id, page, search, status])

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
        <>
            <div className="mb-5 flex items-start justify-between gap-3 max-md:flex-col">
                <h1 className="text-2xl text-slate-500">Store <span className="text-slate-800 font-medium">Orders</span></h1>
                <div className="flex gap-2 w-full md:w-auto max-sm:flex-col">
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by order/customer"
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
                <p>No orders found</p>
            ) : (
                <div className="overflow-x-auto max-w-4xl rounded-md shadow border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                                {["Sr. No.", "Customer", "Total", "Payment", "Coupon", "Status", "Date"].map((heading, i) => (
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
                            )) : orders.map((order, index) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                    onClick={() => openModal(order)}
                                    >
                                    <td className="pl-6 text-green-600" >
                                        {(page - 1) * 12 + index + 1}
                                    </td>
                                    <td className="px-4 py-3">{order.user?.name}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{currency}{order.total}</td>
                                    <td className="px-4 py-3">{order.paymentMethod}</td>
                                    <td className="px-4 py-3">
                                        {order.isCouponUsed ? (
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                                {order.coupon?.code}
                                            </span>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation() }}>
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
                                    <td className="px-4 py-3 text-gray-500">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </td>
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

            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50" >
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4 text-center">
                            Order Details
                        </h2>

                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Customer Details</h3>
                            <p><span className="text-green-700">Name:</span> {selectedOrder.user?.name}</p>
                            <p><span className="text-green-700">Email:</span> {selectedOrder.user?.email}</p>
                            <p><span className="text-green-700">Phone:</span> {selectedOrder.address?.phone}</p>
                            <p><span className="text-green-700">Address:</span> {`${selectedOrder.address?.street}, ${selectedOrder.address?.city}, ${selectedOrder.address?.state}, ${selectedOrder.address?.zip}, ${selectedOrder.address?.country}`}</p>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Products</h3>
                            <div className="space-y-2">
                                {(selectedOrder.orderItems || []).map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 border border-slate-100 shadow rounded p-2">
                                        <img
                                            src={item.product.images?.[0]}
                                            alt={item.product?.name}
                                            className="w-16 h-16 object-cover rounded"
                                        />
                                        <div className="flex-1">
                                            <p className="text-slate-800">{item.product?.name}</p>
                                            <p>Qty: {item.quantity}</p>
                                            <p>Price: {currency}{item.price}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <p><span className="text-green-700">Payment Method:</span> {selectedOrder.paymentMethod}</p>
                            <p><span className="text-green-700">Paid:</span> {selectedOrder.isPaid ? "Yes" : "No"}</p>
                            {selectedOrder.isCouponUsed && (
                                <p><span className="text-green-700">Coupon:</span> {selectedOrder.coupon.code} ({selectedOrder.coupon.discount}% off)</p>
                            )}
                            <p><span className="text-green-700">Status:</span> {selectedOrder.status}</p>
                            <p><span className="text-green-700">Order Date:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={closeModal} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300" >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
