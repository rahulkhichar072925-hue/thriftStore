'use client'

import { useEffect, useState } from "react";
import Image from "next/image";
import Loading from "@/components/Loading";
import toast from "react-hot-toast";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

export default function AdminMembershipsPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [savingId, setSavingId] = useState("");

  const fetchMemberships = async () => {
    const response = await fetch("/api/admin/memberships", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || "Failed to fetch memberships.");
    }
    setUsers(payload?.data || []);
    setLoading(false);
  };

  const updateMembership = async (userId, plan, cycle) => {
    setSavingId(userId);
    try {
      const response = await fetch("/api/admin/memberships", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan, cycle }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to update membership.");
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                plan,
                cycle: plan === "plus" ? cycle : "monthly",
                expiresAt: payload?.data?.expiresAt || null,
              }
            : user
        )
      );
      toast.success(payload?.message || "Membership updated.");
    } catch (error) {
      toast.error(error?.message || "Failed to update membership.");
    } finally {
      setSavingId("");
    }
  };

  useEffect(() => {
    fetchMemberships().catch((error) => {
      toast.error(error?.message || "Failed to load memberships.");
      setLoading(false);
    });
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="text-slate-500 mb-28">
      <h1 className="text-2xl">
        User <span className="text-slate-800 font-medium">Memberships</span>
      </h1>

      <div className="overflow-x-auto mt-5 max-w-6xl border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Cycle</th>
              <th className="px-4 py-3 text-left">Expires</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-200">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Image src={user.imageUrl || "/favicon.ico"} alt={user.name} width={28} height={28} className="rounded-full" />
                    <p className="text-slate-700">{user.name}</p>
                  </div>
                </td>
                <td className="px-4 py-3">{user.email || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${user.plan === "plus" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {user.plan.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">{user.cycle}</td>
                <td className="px-4 py-3">{formatDate(user.expiresAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={savingId === user.id}
                      onClick={() => updateMembership(user.id, "plus", "monthly")}
                      className="px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-900 disabled:opacity-60"
                    >
                      Plus Monthly
                    </button>
                    <button
                      type="button"
                      disabled={savingId === user.id}
                      onClick={() => updateMembership(user.id, "plus", "yearly")}
                      className="px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-900 disabled:opacity-60"
                    >
                      Plus Yearly
                    </button>
                    <button
                      type="button"
                      disabled={savingId === user.id}
                      onClick={() => updateMembership(user.id, "basic", "monthly")}
                      className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Basic
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

