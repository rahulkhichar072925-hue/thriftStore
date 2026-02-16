'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to fetch notifications.");
      }
      setNotifications(payload?.data || []);
      setLoading(false);

      const hasUnread = (payload?.data || []).some((item) => !item.isRead);
      if (hasUnread) {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "" }),
        });
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        window.dispatchEvent(new Event("tsm_notifications_refresh"));
      }
    };

    fetchNotifications().catch((error) => {
      toast.error(error?.message || "Failed to load notifications.");
      setLoading(false);
    });
  }, []);

  const markAllRead = async () => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "" }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      toast.error(payload?.message || "Failed to update notifications.");
      return;
    }
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    window.dispatchEvent(new Event("tsm_notifications_refresh"));
  };

  if (loading) {
    return (
      <div className="mx-6 min-h-[70vh] flex items-center justify-center text-slate-500">
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-3xl mx-auto py-10">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
            <ArrowLeft size={18} />
            Back
          </button>
          <button type="button" onClick={markAllRead} className="text-sm text-slate-600 hover:underline">
            Mark all read
          </button>
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">Notifications</h1>
        <p className="mt-2 text-slate-500">Updates about returns and important account changes.</p>

        <div className="mt-6 space-y-3">
          {notifications.map((item) => (
            <div key={item.id} className={`rounded-xl border p-4 ${item.isRead ? "border-slate-200" : "border-emerald-300 bg-emerald-50/40"}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">{item.title}</p>
                {!item.isRead && <CheckCircle size={16} className="text-emerald-500" />}
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.body}</p>
              <p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {notifications.length === 0 && (
            <p className="text-slate-500">No notifications yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
