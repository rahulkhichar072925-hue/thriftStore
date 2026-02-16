'use client'

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft, Share2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SharedProductsPage() {
  const router = useRouter();
  const products = useSelector((state) => state.product.list);

  const topProducts = useMemo(() => products.slice(0, 20), [products]);

  const shareProduct = async (product) => {
    const url = `${window.location.origin}/product/${product.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Check this on ThriftStore: ${product.name}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }

      const saved = localStorage.getItem("tsm_shared_products");
      const entries = saved ? JSON.parse(saved) : [];
      const next = [{ id: product.id, sharedAt: new Date().toISOString() }, ...entries].slice(0, 50);
      localStorage.setItem("tsm_shared_products", JSON.stringify(next));
      toast.success("Product shared.");
    } catch {
      toast.error("Could not share this product.");
    }
  };

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-5xl mx-auto py-10">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">Shared Products</h1>
        <p className="mt-2 text-slate-500">Quickly share product links on social apps.</p>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topProducts.map((product) => (
            <div key={product.id} className="rounded-xl border border-slate-200 p-4">
              <p className="font-medium text-slate-800">{product.name}</p>
              <p className="text-sm text-slate-500 mt-1">{product.category}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => router.push(`/product/${product.id}`)} className="text-sm rounded-lg border border-slate-300 px-3 py-1.5">Open</button>
                <button onClick={() => shareProduct(product)} className="inline-flex items-center gap-2 text-sm rounded-lg bg-slate-800 text-white px-3 py-1.5">
                  <Share2 size={14} />
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
