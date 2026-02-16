'use client'
import { Bell, Search, ShoppingCart, ShieldCheck, Store, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/nextjs";

const Navbar = () => {
  const router = useRouter();
  const { openSignIn, openSignUp } = useClerk();
  const { isSignedIn, user } = useUser();

  const [search, setSearch] = useState("");
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [hasSellerAccess, setHasSellerAccess] = useState(false);
  const cartCount = useSelector((state) => state.cart.total);
  const loginTargetStorageKey = "tsm_login_target";
  const userRole = String(user?.publicMetadata?.role || "").toLowerCase();
  const membershipTier = String(
    user?.publicMetadata?.membership ||
    user?.publicMetadata?.plan ||
    user?.publicMetadata?.tier ||
    ""
  ).toLowerCase();
  const membershipExpiresAt = user?.publicMetadata?.membershipExpiresAt;
  const plusByPlan = Boolean(
    user?.publicMetadata?.isPlus ||
    user?.publicMetadata?.plusMember ||
    membershipTier === "plus"
  );
  const plusExpiryDate = membershipExpiresAt ? new Date(membershipExpiresAt) : null;
  const plusNotExpired = plusExpiryDate && !Number.isNaN(plusExpiryDate.getTime())
    ? plusExpiryDate.getTime() > Date.now()
    : true;
  const hasPlusMembership = plusByPlan && plusNotExpired;
  const canShowAdminPanel = isSignedIn && userRole === "admin";
  const canShowSellerPanel = isSignedIn && (userRole === "seller" || userRole === "admin" || hasSellerAccess);
  const canShowBecomeSeller = !isSignedIn || (!canShowSellerPanel && userRole !== "admin");

  const openRoleLogin = (targetPath) => {
    if (targetPath) {
      localStorage.setItem(loginTargetStorageKey, targetPath);
    }
    setShowLoginOptions(false);
    if (targetPath === "/store") {
      openSignIn?.({
        forceRedirectUrl: "/store",
        fallbackRedirectUrl: "/store",
        signInForceRedirectUrl: "/store",
        signInFallbackRedirectUrl: "/store",
        signUpForceRedirectUrl: "/create-store",
        signUpFallbackRedirectUrl: "/create-store",
      });
      return;
    }
    if (targetPath === "/admin") {
      openSignIn?.({
        forceRedirectUrl: "/admin",
        fallbackRedirectUrl: "/admin",
        signInForceRedirectUrl: "/admin",
        signInFallbackRedirectUrl: "/admin",
      });
      return;
    }
    openSignIn?.({
      forceRedirectUrl: targetPath || "/",
      fallbackRedirectUrl: targetPath || "/",
      signInForceRedirectUrl: targetPath || "/",
      signInFallbackRedirectUrl: targetPath || "/",
    });
  };

  const openSellerSignUp = () => {
    localStorage.setItem(loginTargetStorageKey, "/create-store");
    setShowLoginOptions(false);
    openSignUp?.({
      forceRedirectUrl: "/create-store",
      fallbackRedirectUrl: "/create-store",
    });
  };

  const handleBecomeSellerClick = (e) => {
    if (isSignedIn) return;
    e.preventDefault();
    localStorage.setItem(loginTargetStorageKey, "/create-store");
    openSignIn?.();
  };

  const handleLogoBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/shop?search=${search}`);
  };

  useEffect(() => {
    const handleOpenLogin = () => {
      if (!isSignedIn) {
        localStorage.setItem(loginTargetStorageKey, "/");
        openSignIn?.();
      }
    };

    window.addEventListener("tsm_open_login", handleOpenLogin);
    return () => window.removeEventListener("tsm_open_login", handleOpenLogin);
  }, [isSignedIn, openSignIn]);

  useEffect(() => {
    if (!isSignedIn) {
      setUnreadNotifications(0);
      return;
    }

    const fetchNotifications = async () => {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) return;
      const unread = (payload?.data || []).filter((item) => !item.isRead).length;
      setUnreadNotifications(unread);
    };

    fetchNotifications().catch(() => {});
    const handleRefresh = () => {
      fetchNotifications().catch(() => {});
    };
    window.addEventListener("tsm_notifications_refresh", handleRefresh);
    return () => window.removeEventListener("tsm_notifications_refresh", handleRefresh);
  }, [isSignedIn]);

  useEffect(() => {
    const resolveSellerAccess = async () => {
      if (!isSignedIn || !user?.id) {
        setHasSellerAccess(false);
        return;
      }
      if (userRole === "seller" || userRole === "admin") {
        setHasSellerAccess(true);
      }

      try {
        const response = await fetch(`/api/store/me?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok && payload?.success) {
          setHasSellerAccess(Boolean(payload?.authorized));
        }
      } catch {
        if (userRole !== "seller" && userRole !== "admin") {
          setHasSellerAccess(false);
        }
      }
    };

    resolveSellerAccess();
  }, [isSignedIn, user?.id, userRole]);

  useEffect(() => {
    if (!isSignedIn) return;
    const targetPath = localStorage.getItem(loginTargetStorageKey);
    if (!targetPath) return;
    localStorage.removeItem(loginTargetStorageKey);
    router.push(targetPath);
  }, [isSignedIn, router]);

  return (
    <>
      <nav className="relative bg-white">
        <div className="mx-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all">
            <button
              type="button"
              onClick={handleLogoBack}
              className="relative"
            >
              <Image src="/brand/thriftstore-logo.svg" alt="ThriftStore" width={230} height={64} className="w-38 sm:w-48 h-auto" />
              {hasPlusMembership ? (
                <p className="absolute text-xs font-semibold -top-1 -right-8 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500">
                  plus
                </p>
              ) : isSignedIn ? (
                <span className="absolute -top-1 -right-5 p-1.5 rounded-full text-white bg-slate-600">
                  <User size={10} />
                </span>
              ) : null}
            </button>

            <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
              <Link href="/">Home</Link>
              <Link href="/shop">Shop</Link>
              {canShowAdminPanel && <Link href="/admin">Admin Panel</Link>}
              {canShowSellerPanel && <Link href="/store">Seller Panel</Link>}
              {canShowBecomeSeller && (
                <Link href="/create-store" onClick={handleBecomeSellerClick}>Become a Seller</Link>
              )}

              <form
                onSubmit={handleSearch}
                className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full"
              >
                <Search size={18} className="text-slate-600" />
                <input
                  className="w-full bg-transparent outline-none placeholder-slate-600"
                  type="text"
                  placeholder="Search products"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  required
                />
              </form>

              <Link href="/account/notifications" className="relative text-slate-600">
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center text-[8px] text-white bg-rose-500 size-3.5 rounded-full">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>

              <Link
                href="/cart"
                className="relative flex items-center gap-2 text-slate-600"
              >
                <ShoppingCart size={18} />
                Cart
                <span className="absolute -top-1 left-3 flex items-center justify-center text-[8px] text-white bg-slate-600 size-3.5 rounded-full">
                  {cartCount}
                </span>
              </Link>

              <SignedIn>
                <Link href="/orders" className="text-sm text-slate-600">
                  My Orders
                </Link>
                <Link href="/account" className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm hover:border-slate-300 hover:bg-slate-50">
                  {user?.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={user?.fullName || "User"}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full object-cover ring-2 ring-slate-200"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white ring-2 ring-slate-200">
                      {(user?.firstName || user?.fullName || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[90px] truncate text-xs font-medium text-slate-700">
                    {user?.firstName || "Account"}
                  </span>
                </Link>
              </SignedIn>
              <SignedOut>
                <button
                  type="button"
                  onClick={() => setShowLoginOptions(true)}
                  className="px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full"
                >
                  Login
                </button>
              </SignedOut>
            </div>

            <div className="sm:hidden flex items-center gap-3">
              {canShowAdminPanel && <Link href="/admin" className="text-sm text-slate-600">Admin Panel</Link>}
              {canShowSellerPanel && <Link href="/store" className="text-sm text-slate-600">Seller Panel</Link>}
              {canShowBecomeSeller && <Link href="/create-store" onClick={handleBecomeSellerClick} className="text-sm text-slate-600">Seller</Link>}
              {isSignedIn && (
                <Link href="/account/notifications" className="relative text-slate-600">
                  <Bell size={18} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center text-[8px] text-white bg-rose-500 size-3.5 rounded-full">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
              )}
              <SignedIn>
                <Link href="/account" className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
                  {user?.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={user?.fullName || "User"}
                      width={26}
                      height={26}
                      className="h-6 w-6 rounded-full object-cover ring-2 ring-slate-200"
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[10px] font-semibold text-white ring-2 ring-slate-200">
                      {(user?.firstName || user?.fullName || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
              </SignedIn>
              <SignedOut>
                <button
                  type="button"
                  onClick={() => setShowLoginOptions(true)}
                  className="px-7 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-sm transition text-white rounded-full"
                >
                  Login
                </button>
              </SignedOut>
            </div>
          </div>
        </div>
        <hr className="border-gray-300" />
      </nav>

      {showLoginOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-5 py-4 text-white">
              <h3 className="text-lg font-semibold">Welcome Back</h3>
              <p className="mt-1 text-sm text-slate-200">Choose how you want to continue.</p>
            </div>
            <div className="p-5">
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => openRoleLogin("/")}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="rounded-lg bg-slate-100 p-2"><ShieldCheck size={16} /></span>
                <span>
                  <span className="block font-medium text-slate-700">Admin Login</span>
                  <span className="block text-xs text-slate-500">Dashboard and management access</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => openRoleLogin("/store")}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="rounded-lg bg-slate-100 p-2"><Store size={16} /></span>
                <span>
                  <span className="block font-medium text-slate-700">Seller Login</span>
                  <span className="block text-xs text-slate-500">Manage store, products and orders</span>
                </span>
              </button>
              <button
                type="button"
                onClick={openSellerSignUp}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left hover:bg-emerald-100"
              >
                <span className="block font-medium text-emerald-700">Seller Sign Up</span>
                <span className="block text-xs text-emerald-600">Create seller account and submit store request</span>
              </button>
              <button
                type="button"
                onClick={() => openRoleLogin("/")}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="rounded-lg bg-slate-100 p-2"><User size={16} /></span>
                <span>
                  <span className="block font-medium text-slate-700">User Login</span>
                  <span className="block text-xs text-slate-500">Shop products and track orders</span>
                </span>
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLoginOptions(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
