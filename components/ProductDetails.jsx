'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { buildVariantKey } from "@/lib/cartKey";

const ProductDetails = ({ product }) => {
    const productId = product.id;
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "Rs";
    const fallbackImage = "/favicon.ico";

    const cart = useSelector((state) => state.cart.cartItems);
    const dispatch = useDispatch();
    const router = useRouter();

    const productImages =
        Array.isArray(product?.images) && product.images.length
            ? product.images.filter((image) => typeof image === "string" && image.trim())
            : [fallbackImage];
    const productRatings = Array.isArray(product?.rating) ? product.rating : [];

    const [mainImage, setMainImage] = useState(productImages[0] || fallbackImage);
    const [failedImageMap, setFailedImageMap] = useState({});
    const sizeOptionsFromProduct = Array.isArray(product?.sizes) ? product.sizes.filter(Boolean) : [];
    const sizeOptions = sizeOptionsFromProduct.length > 0 ? sizeOptionsFromProduct : ["Free Size"];
    const colorOptions = Array.isArray(product?.colors) ? product.colors.filter(Boolean) : [];
    const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || "");
    const [selectedColor, setSelectedColor] = useState(colorOptions[0] || "");
    const cartKey = buildVariantKey({ productId, size: selectedSize, color: selectedColor });
    const inCart = Boolean(cart[cartKey]);
    const stockQty = Number(product?.stockQty || 0);
    const isInStock = Boolean(product?.inStock) && stockQty > 0;
    const isLowStock = isInStock && stockQty <= 3;

    const addToCartHandler = () => {
        if (!isInStock) return;
        if (sizeOptions.length > 0 && !selectedSize) {
            toast.error("Please select size.");
            return;
        }
        if (colorOptions.length > 0 && !selectedColor) {
            toast.error("Please select color.");
            return;
        }
        dispatch(addToCart({ productId, cartKey }));
    };
    const handlePrimaryAction = () => {
        if (!inCart) {
            addToCartHandler();
            return;
        }
        router.push('/cart');
    };

    const averageRating = productRatings.length
        ? productRatings.reduce((acc, item) => acc + (item?.rating || 0), 0) / productRatings.length
        : 0;
    const mrp = Number(product?.mrp || 0);
    const price = Number(product?.price || 0);
    const hasDiscount = mrp > price && price > 0;
    const discountPercent = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
    const estimatedDelivery = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });

    const resolveImage = (src) => {
        const cleanSrc = typeof src === "string" ? src.trim() : "";
        if (!cleanSrc) return fallbackImage;
        return failedImageMap[cleanSrc] ? fallbackImage : cleanSrc;
    };

    const markImageFailed = (src) => {
        const cleanSrc = typeof src === "string" ? src.trim() : "";
        if (!cleanSrc) return;
        setFailedImageMap((prev) => ({ ...prev, [cleanSrc]: true }));
    };

    return (
        <div className="flex max-lg:flex-col gap-12 pb-24 sm:pb-0">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {productImages.map((image, index) => (
                        <div
                            key={index}
                            onClick={() => setMainImage(productImages[index])}
                            className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer"
                        >
                            <Image
                                src={resolveImage(image)}
                                className="group-hover:scale-103 group-active:scale-95 transition"
                                alt={`${product?.name || "Product"} thumbnail ${index + 1}`}
                                width={45}
                                height={45}
                                onError={() => markImageFailed(image)}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg overflow-hidden">
                    <Image
                        src={resolveImage(mainImage)}
                        alt={product?.name || "Product"}
                        width={250}
                        height={250}
                        className="transition-transform duration-300 hover:scale-110"
                        onError={() => markImageFailed(mainImage)}
                    />
                </div>
            </div>
            <div className="flex-1 lg:sticky lg:top-24 self-start">
                <h1 className="text-3xl font-semibold text-slate-800">{product.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        Brand: {product?.brand || "Unbranded"}
                    </span>
                    {selectedSize && (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                            Size: {selectedSize}
                        </span>
                    )}
                    {selectedColor && (
                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                            Color: {selectedColor}
                        </span>
                    )}
                </div>
                <div className='flex items-center mt-2'>
                    {Array(5).fill('').map((_, index) => (
                        <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={averageRating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                    ))}
                    <p className="text-sm ml-3 text-slate-500">{productRatings.length} Reviews</p>
                </div>
                <div className="mt-5 mb-3 flex items-end gap-3">
                    <p className="text-4xl font-semibold text-slate-900">
                        {currency}{price.toLocaleString()}
                    </p>
                    {hasDiscount && (
                        <p className="text-xl text-slate-500 line-through">
                            {currency}{mrp.toLocaleString()}
                        </p>
                    )}
                    {hasDiscount && (
                        <span className="mb-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {discountPercent}% OFF
                        </span>
                    )}
                </div>
                <div className="mb-3">
                    {!isInStock ? (
                        <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">Out of Stock</span>
                    ) : isLowStock ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Only {stockQty} left</span>
                    ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">In Stock</span>
                    )}
                </div>
                {hasDiscount && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <TagIcon size={14} />
                        <p>Save {discountPercent}% right now</p>
                    </div>
                )}
                <p className="mt-3 text-sm text-slate-600">
                    Delivery by <span className="font-semibold text-slate-800">{estimatedDelivery}</span> - Free returns within 7 days
                </p>
                {(sizeOptions.length > 0 || colorOptions.length > 0) && (
                    <div className="mt-6 flex flex-col gap-4">
                        {sizeOptions.length > 0 && (
                            <div>
                                <p className="text-sm text-slate-600 mb-2">Select Size</p>
                                {sizeOptionsFromProduct.length === 0 && (
                                    <p className="mb-2 text-xs text-slate-500">Detailed size not provided by seller, using Free Size.</p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {sizeOptions.map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => setSelectedSize(size)}
                                            className={`rounded border px-3 py-1.5 text-sm ${selectedSize === size ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {colorOptions.length > 0 && (
                            <div>
                                <p className="text-sm text-slate-600 mb-2">Select Color</p>
                                <div className="flex flex-wrap gap-2">
                                    {colorOptions.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setSelectedColor(color)}
                                            className={`rounded border px-3 py-1.5 text-sm ${selectedColor === color ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="hidden sm:flex items-end gap-5 mt-10">
                    {inCart && (
                        <div className="flex flex-col gap-3">
                            <p className="text-lg text-slate-800 font-semibold">Quantity</p>
                            <Counter
                                productId={productId}
                                cartKey={cartKey}
                                maxQty={stockQty}
                                onMaxReached={() => toast.error("Maximum available stock reached.")}
                            />
                        </div>
                    )}
                    <button
                        onClick={handlePrimaryAction}
                        disabled={!isInStock && !inCart}
                        className="bg-slate-800 text-white px-10 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                        {!inCart ? (isInStock ? 'Add to Cart' : 'Out of Stock') : 'View Cart'}
                    </button>
                </div>
                <hr className="border-gray-300 my-5" />
                <div className="flex flex-col gap-4 text-slate-500">
                    <p className="flex gap-3"> <EarthIcon className="text-slate-400" /> Free shipping worldwide </p>
                    <p className="flex gap-3"> <CreditCardIcon className="text-slate-400" /> 100% Secured Payment </p>
                    <p className="flex gap-3"> <UserIcon className="text-slate-400" /> Trusted by top brands </p>
                </div>
            </div>
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
                <div className="mx-4 flex items-center justify-between gap-3 py-3">
                    <div>
                        <p className="text-lg font-semibold text-slate-900">{currency}{price.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">
                            {!isInStock ? "Out of stock" : isLowStock ? `Only ${stockQty} left` : "In stock"}
                        </p>
                    </div>
                    <button
                        onClick={handlePrimaryAction}
                        disabled={!isInStock && !inCart}
                        className="min-w-36 rounded bg-slate-800 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                        {!inCart ? (isInStock ? 'Add to Cart' : 'Out of Stock') : 'View Cart'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
