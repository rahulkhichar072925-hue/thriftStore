'use client'
import { useEffect, useState } from "react"
import Loading from "../Loading"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
import toast from "react-hot-toast"
import { useUser } from "@clerk/nextjs"

const StoreLayout = ({ children }) => {

    const { isLoaded, isSignedIn, user } = useUser()
    const [isSeller, setIsSeller] = useState(false)
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)

    const fetchIsSeller = async () => {
        if (!isLoaded) return

        if (!isSignedIn || !user?.id) {
            setIsSeller(false)
            setStoreInfo(null)
            setLoading(false)
            return
        }

        const role = String(user?.publicMetadata?.role || "").toLowerCase()
        if (role === "admin") {
            setIsSeller(true)
        }

        const currentUserId = user.id
        try {
            const response = await fetch(`/api/store/me?userId=${encodeURIComponent(currentUserId)}`, { cache: "no-store" })
            const payload = await response.json()
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to verify seller access.")
            }

            setIsSeller((prev) => prev || Boolean(payload?.authorized))
            setStoreInfo(payload?.data || null)
        } catch (error) {
            if (role !== "admin") throw error
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchIsSeller().catch((error) => {
            toast.error(error?.message || "Failed to verify seller.")
            setLoading(false)
        })
    }, [isLoaded, isSignedIn, user?.id])

    return loading ? (
        <Loading />
    ) : isSeller ? (
        <div className="flex flex-col h-screen">
            <SellerNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <SellerSidebar storeInfo={storeInfo} />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
                    {children}
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">You are not authorized to access this page</h1>
            <p className="mt-3 text-slate-500">Only approved sellers can access seller dashboard.</p>
            <Link href="/" className="bg-slate-700 text-white flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full">
                Go to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    )
}

export default StoreLayout
