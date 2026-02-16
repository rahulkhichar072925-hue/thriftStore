'use client'
import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export default function Product() {

    const { productId } = useParams();
    const [product, setProduct] = useState();
    const products = useSelector(state => state.product.list);

    useEffect(() => {
        const selectedProduct = products.find((item) => item.id === productId);
        if (selectedProduct) setProduct(selectedProduct);
        scrollTo(0, 0)
    }, [productId, products]);

    useEffect(() => {
        const handleSubmittedRating = (event) => {
            const submittedRating = event?.detail?.rating;
            if (!submittedRating || submittedRating.productId !== productId) return;

            setProduct((prev) => {
                if (!prev) return prev;
                const ratings = Array.isArray(prev.rating) ? [...prev.rating] : [];
                const existingIndex = ratings.findIndex(
                    (item) =>
                        item?.userId === submittedRating?.userId &&
                        item?.productId === submittedRating?.productId &&
                        item?.orderId === submittedRating?.orderId
                );

                if (existingIndex === -1) {
                    ratings.unshift(submittedRating);
                } else {
                    ratings[existingIndex] = { ...ratings[existingIndex], ...submittedRating };
                }

                return {
                    ...prev,
                    rating: ratings,
                };
            });
        };

        window.addEventListener("tsm_rating_submitted", handleSubmittedRating);
        return () => window.removeEventListener("tsm_rating_submitted", handleSubmittedRating);
    }, [productId]);

    return (
        <div className="mx-6">
            <div className="max-w-7xl mx-auto">

                {/* Breadcrums */}
                <div className="  text-gray-600 text-sm mt-8 mb-5">
                    Home / Products / {product?.category}
                </div>

                {/* Product Details */}
                {product && (<ProductDetails product={product} />)}

                {/* Description & Reviews */}
                {product && (<ProductDescription product={product} />)}
            </div>
        </div>
    );
}
