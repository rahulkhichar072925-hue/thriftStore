'use client'
import Loading from "@/components/Loading"
import OrdersAreaChart from "@/components/OrdersAreaChart"
import { CircleDollarSignIcon, ShoppingBasketIcon, StoreIcon, TagsIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function AdminDashboard() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "₹"
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        products: 0,
        revenue: 0,
        orders: 0,
        stores: 0,
        allOrders: [],
    })

    const dashboardCardsData = [
        { title: 'Total Products', value: dashboardData.products, icon: ShoppingBasketIcon, href: "/shop" },
        { title: 'Total Revenue', value: `${currency}${Number(dashboardData.revenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: CircleDollarSignIcon, href: "/admin" },
        { title: 'Total Orders', value: dashboardData.orders, icon: TagsIcon, href: "/admin/orders" },
        { title: 'Total Stores', value: dashboardData.stores, icon: StoreIcon, href: "/admin/stores" },
    ]

    const fetchDashboardData = async () => {
        const response = await fetch("/api/admin/dashboard", { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to fetch dashboard data.")
        }

        setDashboardData(payload.data)
        setLoading(false)
    }

    useEffect(() => {
        fetchDashboardData().catch((error) => {
            toast.error(error?.message || "Failed to load admin dashboard.")
            setLoading(false)
        })
    }, [])

    if (loading) return <Loading />

    return (
        <div className="text-slate-500">
            <h1 className="text-2xl">Admin <span className="text-slate-800 font-medium">Dashboard</span></h1>

            <div className="flex flex-wrap gap-5 my-10 mt-4">
                {dashboardCardsData.map((card, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => router.push(card.href)}
                        className="flex items-center gap-10 border border-slate-200 p-3 px-6 rounded-lg text-left hover:bg-slate-50 transition active:scale-[0.99]"
                    >
                        <div className="flex flex-col gap-3 text-xs">
                            <p>{card.title}</p>
                            <b className="text-2xl font-medium text-slate-700">{card.value}</b>
                        </div>
                        <card.icon size={50} className=" w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full" />
                    </button>
                ))}
            </div>

            <OrdersAreaChart allOrders={dashboardData.allOrders} />
        </div>
    )
}
