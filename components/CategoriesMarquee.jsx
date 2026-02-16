'use client'
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

const CategoriesMarquee = () => {
    const router = useRouter();
    const products = useSelector(state => state.product.list);
    const [dbProducts, setDbProducts] = useState([]);

    useEffect(() => {
        const fetchDbProducts = async () => {
            const response = await fetch("/api/products", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to load categories.");
            }
            setDbProducts(payload?.data || []);
        };

        fetchDbProducts().catch((error) => {
            toast.error(error?.message || "Failed to load categories.");
        });
    }, []);

    const categories = useMemo(() => {
        const mapById = new Map();
        [...dbProducts, ...products].forEach((product) => {
            if (product?.id) mapById.set(product.id, product);
        });
        const allProducts = Array.from(mapById.values());
        const seen = new Set();
        const result = [];

        for (const product of allProducts) {
            if (!product?.inStock) continue;
            const category = product?.category?.trim();
            if (!category) continue;

            const normalized = category.toLowerCase();
            if (seen.has(normalized)) continue;
            seen.add(normalized);
            result.push(category);
        }

        return result;
    }, [products, dbProducts]);

    return (
        <div className="overflow-hidden w-full relative max-w-7xl mx-auto select-none group sm:my-20">
            <div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
            <div className="flex min-w-[200%] animate-[marqueeScroll_10s_linear_infinite] sm:animate-[marqueeScroll_40s_linear_infinite] group-hover:[animation-play-state:paused] gap-4" >
                {[...categories, ...categories, ...categories, ...categories].map((category, index) => (
                    <button
                        key={`${category}-${index}`}
                        onClick={() => router.push(`/shop?search=${encodeURIComponent(category)}`)}
                        className="px-5 py-2 bg-slate-100 rounded-lg text-slate-500 text-xs sm:text-sm hover:bg-slate-600 hover:text-white active:scale-95 transition-all duration-300"
                    >
                        {category}
                    </button>
                ))}
            </div>
            <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />
        </div>
    );
};

export default CategoriesMarquee;
