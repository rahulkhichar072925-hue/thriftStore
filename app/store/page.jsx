'use client'
import Loading from "@/components/Loading"
import { AlertTriangleIcon, CircleDollarSignIcon, MessageSquareWarningIcon, ShoppingBasketIcon, StarIcon, TagsIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useUser } from "@clerk/nextjs"

export default function Dashboard() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "Rs"
    const router = useRouter()
    const { isLoaded, isSignedIn, user } = useUser()

    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        pendingComplaints: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        ratings: [],
    })

    const dashboardCardsData = [
        { title: "Total Products", value: dashboardData.totalProducts, icon: ShoppingBasketIcon },
        { title: "Total Earnings", value: `${currency}${Number(dashboardData.totalEarnings || 0).toLocaleString()}`, icon: CircleDollarSignIcon },
        { title: "Total Orders", value: dashboardData.totalOrders, icon: TagsIcon },
        { title: "Pending Complaints", value: dashboardData.pendingComplaints || 0, icon: MessageSquareWarningIcon, href: "/store/complaints" },
        {
            title: "Inventory Alerts",
            value: `${dashboardData.lowStockProducts || 0} Low / ${dashboardData.outOfStockProducts || 0} Out`,
            icon: AlertTriangleIcon,
            href: "/store/manage-product",
        },
        { title: "Total Ratings", value: dashboardData.ratings.length, icon: StarIcon },
    ]

    const fetchDashboardData = async () => {
        if (!user?.id) {
            setLoading(false)
            return
        }

        const response = await fetch(`/api/store/dashboard?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to load dashboard data.")
        }
        setDashboardData(payload.data)
        setLoading(false)
    }

    useEffect(() => {
        if (!isLoaded) return
        if (!isSignedIn || !user?.id) {
            setLoading(false)
            return
        }

        fetchDashboardData().catch((error) => {
            toast.error(error?.message || "Failed to load seller dashboard.")
            setLoading(false)
        })
    }, [isLoaded, isSignedIn, user?.id])

    if (loading) return <Loading />

    return (
        <div className=" text-slate-500 mb-28">
            <h1 className="text-2xl">Seller <span className="text-slate-800 font-medium">Dashboard</span></h1>

            <div className="flex flex-wrap gap-5 my-10 mt-4">
                {dashboardCardsData.map((card, index) => (
                    <div
                        key={index}
                        onClick={() => card.href && router.push(card.href)}
                        className={`flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg ${card.href ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition" : ""}`}
                    >
                        <div className="flex flex-col gap-3 text-xs">
                            <p>{card.title}</p>
                            <b className="text-2xl font-medium text-slate-700">{card.value}</b>
                        </div>
                        <card.icon size={50} className=" w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full" />
                    </div>
                ))}
            </div>

            <h2>Total Reviews</h2>

            <div className="mt-5">
                {dashboardData.ratings.map((review, index) => (
                    <div key={index} className="flex max-sm:flex-col gap-5 sm:items-center justify-between py-6 border-b border-slate-200 text-sm text-slate-600 max-w-4xl">
                        <div>
                            <div className="flex gap-3">
                                <Image src={review?.user?.image || "/favicon.ico"} alt={review?.user?.name || "User"} className="w-10 aspect-square rounded-full" width={100} height={100} />
                                <div>
                                    <p className="font-medium">{review?.user?.name}</p>
                                    <p className="font-light text-slate-500">{new Date(review.createdAt).toDateString()}</p>
                                </div>
                            </div>
                            <p className="mt-3 text-slate-500 max-w-xs leading-6">{review.review}</p>
                        </div>
                        <div className="flex flex-col justify-between gap-6 sm:items-end">
                            <div className="flex flex-col sm:items-end">
                                <p className="text-slate-400">{review.product?.category}</p>
                                <p className="font-medium">{review.product?.name}</p>
                                <div className='flex items-center'>
                                    {Array(5).fill('').map((_, idx) => (
                                        <StarIcon key={idx} size={17} className='text-transparent mt-0.5' fill={review.rating >= idx + 1 ? "#00C950" : "#D1D5DB"} />
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => router.push(`/product/${review.product.id}`)} className="bg-slate-100 px-5 py-2 hover:bg-slate-200 rounded transition-all">View Product</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
