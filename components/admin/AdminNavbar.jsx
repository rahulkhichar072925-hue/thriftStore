'use client'
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { UserButton } from "@clerk/nextjs"

const AdminNavbar = () => {
    const router = useRouter()

    const handleLogoBack = (e) => {
        e.preventDefault()
        if (window.history.length > 1) {
            router.back()
            return
        }
        router.push("/")
    }

    return (
        <div className="flex items-center justify-between px-12 py-3 border-b border-slate-200 transition-all">
            <Link href="/" onClick={handleLogoBack} className="relative">
                <Image src="/brand/thriftstore-logo.svg" alt="ThriftStore" width={230} height={64} className="w-44 h-auto" />
                <p className="absolute text-xs font-semibold -top-1 -right-13 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500">
                    Admin
                </p>
            </Link>
            <div className="flex items-center gap-3">
                <Link href="/" className="text-sm text-slate-600 hover:text-slate-800">
                    User Home
                </Link>
                <Link href="/store" className="text-sm text-slate-600 hover:text-slate-800">
                    Seller Page
                </Link>
                <p>Hi, Admin</p>
                <UserButton afterSignOutUrl="/" />
            </div>
        </div>
    )
}

export default AdminNavbar
