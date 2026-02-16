'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function AdminApprove() {

    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)
    const normalizeStoreText = (value) => typeof value === "string" ? value.replaceAll("Group 8", "ThriftStore") : value
    const normalizeStore = (store) => ({
        ...store,
        name: normalizeStoreText(store.name),
        description: normalizeStoreText(store.description),
        user: store.user ? { ...store.user, name: normalizeStoreText(store.user.name) } : store.user,
    })


    const fetchStores = async () => {
        const response = await fetch("/api/store-requests", { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to fetch store requests.")
        }
        const parsedStores = (payload?.data || []).map(normalizeStore)
        setStores(parsedStores.filter((store) => store.status === "pending"))
        setLoading(false)
    }

    const handleApprove = async ({ storeId, status }) => {
        const response = await fetch(`/api/store-requests/${storeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to update store.")
        }
        setStores((prev) => prev.filter((store) => store.id !== storeId))
        return payload?.message || (status === "approved" ? "Store approved successfully." : "Store rejected.")
    }

    useEffect(() => {
            fetchStores().catch((error) => {
                toast.error(error?.message || "Failed to load requests.")
                setLoading(false)
            })
    }, [])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Approve <span className="text-slate-800 font-medium">Stores</span></h1>

            {stores.length ? (
                <div className="flex flex-col gap-4 mt-4">
                    {stores.map((store) => (
                        <div key={store.id} className="bg-white border rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl" >
                            {/* Store Info */}
                            <StoreInfo store={store} />

                            {/* Actions */}
                            <div className="flex gap-3 pt-2 flex-wrap">
                                <button onClick={() => toast.promise(handleApprove({ storeId: store.id, status: 'approved' }), { loading: "approving", success: (msg) => msg, error: (err) => err?.message || "Failed to approve" })} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm" >
                                    Approve
                                </button>
                                <button onClick={() => toast.promise(handleApprove({ storeId: store.id, status: 'rejected' }), { loading: 'rejecting', success: (msg) => msg, error: (err) => err?.message || "Failed to reject" })} className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 text-sm" >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}

                </div>) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No Application Pending</h1>
                </div>
            )}
        </div>
    ) : <Loading />
}
