'use client'

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ChevronRight,
  Search,
  ShoppingCart,
  PhoneCall,
  Gift,
  Wallet,
  Landmark,
  CreditCard,
  Languages,
  Heart,
  Share2,
  Store,
  BadgeIndianRupee,
  BriefcaseBusiness,
  Settings,
  Star,
  Scale,
  LogOut,
} from "lucide-react";

const ItemRow = ({ icon: Icon, title, badge, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-between py-4 text-left border-b border-slate-200"
  >
    <span className="flex items-center gap-3 text-slate-700">
      <Icon size={18} className="text-slate-500" />
      <span>{title}</span>
    </span>
    {badge ? (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{badge}</span>
    ) : (
      <ChevronRight size={16} className="text-slate-400" />
    )}
  </button>
);

export default function AccountPage() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { signOut, openSignIn, openUserProfile } = useClerk();
  const cartCount = useSelector((state) => state.cart.total);
  const [returnSummary, setReturnSummary] = useState({ count: 0, nextPickup: "" });

  const userName = user?.fullName || user?.firstName || "Account";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  const toggleLanguage = () => {
    const current = localStorage.getItem("tsm_language") || "en";
    const next = current === "en" ? "hi" : "en";
    localStorage.setItem("tsm_language", next);
    toast.success(`Language switched to ${next.toUpperCase()}.`);
  };

  useEffect(() => {
    const fetchReturns = async () => {
      const response = await fetch("/api/returns", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) return;
      const list = payload?.data || [];
      const upcoming = list
        .map((item) => (item.pickupDate ? new Date(item.pickupDate) : null))
        .filter((date) => date && !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      setReturnSummary({
        count: list.length,
        nextPickup: upcoming.length ? upcoming[0].toLocaleString() : "",
      });
    };

    if (isSignedIn) {
      fetchReturns().catch(() => {});
    }
  }, [isSignedIn]);

  if (!isSignedIn) {
    return (
      <div className="mx-6 min-h-[70vh]">
        <div className="max-w-2xl mx-auto py-16 text-center">
          <h1 className="text-2xl font-semibold text-slate-800">Please sign in to open account page</h1>
          <button
            type="button"
            onClick={() => openSignIn?.({ forceRedirectUrl: "/account", fallbackRedirectUrl: "/account" })}
            className="mt-6 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-lg"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl bg-white min-h-[80vh]">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="text-slate-700">
            <ArrowLeft size={20} />
          </button>
          <p className="font-semibold tracking-wide text-slate-800">ACCOUNT</p>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => router.push("/shop")} className="text-slate-700">
            <Search size={20} />
          </button>
          <Link href="/cart" className="relative text-slate-700">
            <ShoppingCart size={20} />
            <span className="absolute -top-1.5 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500 text-white">
              {cartCount}
            </span>
          </Link>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-slate-200">
        <button
          type="button"
          onClick={() => openUserProfile?.()}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-slate-100 overflow-hidden">
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt={userName} className="size-full object-cover" />
              ) : null}
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-800">{userName}</p>
              <p className="text-sm text-slate-500">{userEmail}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-400" />
        </button>
      </div>

      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => router.push("/account/help")}
          className="rounded-xl border border-slate-200 p-4 text-slate-700"
        >
          <PhoneCall className="mx-auto text-indigo-500" size={20} />
          <p className="mt-3 font-medium">Help Centre</p>
        </button>
        <button
          type="button"
          onClick={() => router.push("/account/referrals")}
          className="rounded-xl border border-slate-200 p-4 text-slate-700"
        >
          <Gift className="mx-auto text-indigo-500" size={20} />
          <p className="mt-3 font-medium">Refer & Earn</p>
        </button>
      </div>

      <div className="px-4 pt-2">
        <h3 className="font-semibold text-slate-700 mb-1">My Payments</h3>
        <ItemRow icon={Wallet} title="Thrift Plus Membership" badge="Discount up to Rs120" onClick={() => router.push("/pricing")} />
        <ItemRow icon={Landmark} title="Bank & UPI Details" onClick={() => router.push("/account/bank-upi")} />
        <ItemRow icon={CreditCard} title="Payment & Refund" onClick={() => router.push("/orders")} />
      </div>

      <div className="px-4 pt-6">
        <h3 className="font-semibold text-slate-700 mb-1">My Activity</h3>
        <ItemRow icon={Languages} title="Change Language" onClick={toggleLanguage} />
        <ItemRow icon={Share2} title="Notifications" onClick={() => router.push("/account/notifications")} />
        <ItemRow icon={Heart} title="Wishlisted Products" onClick={() => router.push("/account/wishlist")} />
        <ItemRow icon={Share2} title="Shared Products" onClick={() => router.push("/account/shared")} />
        <ItemRow icon={Store} title="Followed Shops" onClick={() => router.push("/account/followed-shops")} />
        <ItemRow icon={Store} title="My Returns" onClick={() => router.push("/account/returns")} />
        <div className="mt-3 rounded-xl border border-slate-200 p-3 bg-slate-50">
          <p className="text-xs text-slate-500">Upcoming Pickups</p>
          <p className="text-sm font-semibold text-slate-800">
            {returnSummary.count ? `${returnSummary.count} return(s)` : "No returns"}
          </p>
          {returnSummary.nextPickup && (
            <p className="text-xs text-slate-600 mt-1">Next pickup: {returnSummary.nextPickup}</p>
          )}
          <button
            type="button"
            onClick={() => router.push("/account/returns")}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            View calendar
          </button>
        </div>
      </div>

      <div className="px-4 pt-6 pb-10">
        <h3 className="font-semibold text-slate-700 mb-1">Others</h3>
        <ItemRow icon={BadgeIndianRupee} title="Thrift Balance" badge="Rs0" onClick={() => router.push("/account/wallet")} />
        <ItemRow icon={BriefcaseBusiness} title="Become a Supplier" onClick={() => router.push("/create-store")} />
        <ItemRow icon={Settings} title="Settings" onClick={() => router.push("/account/settings")} />
        <ItemRow icon={Star} title="Rate ThriftStore" onClick={() => router.push("/account/rate")} />
        <ItemRow icon={Scale} title="Legal and Policies" onClick={() => router.push("/legal")} />
        <ItemRow
          icon={LogOut}
          title="Logout"
          onClick={() => signOut?.({ redirectUrl: "/" })}
        />
      </div>
    </div>
  );
}
