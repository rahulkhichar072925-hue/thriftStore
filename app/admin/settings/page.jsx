'use client'

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        email: "",
        contact: "",
        address: "",
    });

    useEffect(() => {
        const loadSettings = async () => {
            const response = await fetch("/api/admin/site-settings", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to load settings.");
            }
            setForm({
                email: payload?.data?.email || "",
                contact: payload?.data?.contact || "",
                address: payload?.data?.address || "",
            });
            setLoading(false);
        };

        loadSettings().catch((error) => {
            toast.error(error?.message || "Failed to load settings.");
            setLoading(false);
        });
    }, []);

    const onSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await fetch("/api/admin/site-settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to save settings.");
            }
            toast.success(payload?.message || "Settings saved.");
        } catch (error) {
            toast.error(error?.message || "Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="text-slate-600 mb-28 max-w-2xl">
            <h1 className="text-2xl">Site <span className="text-slate-800 font-medium">Settings</span></h1>
            <p className="text-sm mt-1 text-slate-500">These values are shown in footer contact section.</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
                <div>
                    <label className="block text-sm mb-1">Contact Email</label>
                    <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-400"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Contact Number</label>
                    <input
                        type="text"
                        required
                        value={form.contact}
                        onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-400"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Address</label>
                    <textarea
                        rows={3}
                        required
                        value={form.address}
                        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                        className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-400"
                    />
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-70"
                >
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </form>
        </div>
    );
}
