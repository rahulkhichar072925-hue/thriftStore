'use client'

import { useEffect, useState } from "react";

const HomeCoupons = () => {
  const [coupons, setCoupons] = useState([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await fetch("/api/coupons?public=true&active=true", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.success) return;
        setCoupons(payload?.data || []);
      } catch {
        setCoupons([]);
      }
    };

    fetchCoupons();
  }, []);

  if (!coupons.length) return null;

  return (
    <section className="mx-6 mt-12">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl text-slate-700">
          Live <span className="text-slate-900 font-medium">Coupons</span>
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {coupons.map((coupon) => (
            <div key={coupon.code} className="rounded-xl border border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
              <p className="text-xs text-slate-500">Coupon Code</p>
              <p className="text-xl tracking-wide font-semibold text-slate-800">{coupon.code}</p>
              <p className="mt-2 text-sm text-slate-600">{coupon.description}</p>
              <p className="mt-3 inline-flex rounded-full bg-emerald-600/10 px-3 py-1 text-emerald-700 text-xs font-medium">
                {coupon.discount}% OFF
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCoupons;

