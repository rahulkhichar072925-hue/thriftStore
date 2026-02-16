'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { AlertTriangleIcon } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminStores() {
    const router = useRouter()
    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)
    const [storeToRemove, setStoreToRemove] = useState(null)

    const isProtectedAdminStore = (store) => {
        const name = (store?.name || "").trim().toLowerCase()
        const username = (store?.username || "").trim().toLowerCase()
        return name === "thriftstore" || username === "thriftstore"
    }

    const normalizeStoreText = (value) =>
        typeof value === "string" ? value.replaceAll("Group 8", "ThriftStore") : value

    const normalizeStore = (store) => ({
        ...store,
        name: isProtectedAdminStore(store) ? "ThriftStore" : normalizeStoreText(store.name),
        username: store.username,
        displayUsername: isProtectedAdminStore(store) ? "thriftstore" : store.username,
        description: normalizeStoreText(store.description),
        user: store.user ? { ...store.user, name: normalizeStoreText(store.user.name) } : store.user,
    })

    const fetchStores = async () => {
        const response = await fetch("/api/store-requests", { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to fetch active stores.")
        }
        const parsedStores = (payload?.data || []).map(normalizeStore)
        setStores(parsedStores.filter((store) => store.status === "approved"))
        setLoading(false)
    }

    const toggleIsActive = async (storeId, isActive) => {
        const response = await fetch(`/api/store-requests/${storeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to update store status.")
        }
        setStores((prev) => prev.map((store) => (store.id === storeId ? normalizeStore(payload.data) : store)))
        return payload?.message || "Store status updated."
    }

    const removeStore = async (storeId) => {
        const response = await fetch(`/api/store-requests/${storeId}`, {
            method: "DELETE",
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to remove store.")
        }
        setStores((prev) => prev.filter((store) => store.id !== storeId))
        return payload?.message || "Store removed."
    }

    const handleActiveToggle = (store) => {
        if (isProtectedAdminStore(store)) {
            toast.error("ThriftStore is admin store and cannot be removed.")
            return
        }

        if (store.isActive) {
            setStoreToRemove(store)
            return
        }

        toast.promise(toggleIsActive(store.id, true), {
            loading: "Updating data...",
            success: (msg) => msg || "Store activated.",
            error: (err) => err?.message || "Failed to activate store.",
        })
    }

    const confirmRemoveStore = () => {
        if (!storeToRemove) return
        toast.promise(removeStore(storeToRemove.id), {
            loading: "Removing store...",
            success: (msg) => msg || "Store removed.",
            error: (err) => err?.message || "Failed to remove store.",
        })
        setStoreToRemove(null)
    }

    const openStoreProfile = (store) => {
        const username = (store?.username || "").trim()
        if (!username) {
            toast.error("Store username not found.")
            return
        }
        router.push(`/shop/${encodeURIComponent(username)}`)
    }

    useEffect(() => {
        fetchStores().catch((error) => {
            toast.error(error?.message || "Failed to load active stores.")
            setLoading(false)
        })
    }, [])

    return !loading ? (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Live <span className="text-slate-800 font-medium">Stores</span></h1>

            {stores.length ? (
                <div className="flex flex-col gap-4 mt-4">
                    {stores.map((store) => (
                        <div key={store.id} className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl" >
                            <button
                                type="button"
                                onClick={() => openStoreProfile(store)}
                                className="flex-1 text-left cursor-pointer hover:opacity-95 transition"
                            >
                                <StoreInfo store={store} />
                            </button>
                            <div className="flex items-center gap-3 pt-2 flex-wrap">
                                <p>Active</p>
                                <label className="relative inline-flex items-center cursor-pointer text-gray-900">
                                    <input type="checkbox" className="sr-only peer" onChange={() => handleActiveToggle(store)} checked={store.isActive} />
                                    <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                                    <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                </label>
                                {isProtectedAdminStore(store) && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Admin Store</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No stores Available</h1>
                </div>
            )}

            {storeToRemove && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-red-100 p-2">
                                <AlertTriangleIcon className="text-red-600" size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">Remove Store?</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    This will remove <span className="font-medium text-slate-700">{storeToRemove.name}</span> from Active Stores.
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    You can approve new store requests from Approve Store section.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setStoreToRemove(null)}
                                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmRemoveStore}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                            >
                                Yes, Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    ) : <Loading />
}
