'use client'
import { assets } from "@/assets/assets"
import Image from "next/image"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useUser } from "@clerk/nextjs"
import { uploadMultipleImages } from "@/lib/client/cloudinaryUpload"

export default function StoreAddProduct() {
    const { user } = useUser()

    const categories = ['Shoes', 'Clothing', 'Jackets', 'Running Shoes', 'Golf Shoes', 'Sports & Outdoors', 'Topwear', 'Winter Jacket', 'Hoodies', 'Others']
    const audienceOptions = ["Men", "Women", "Kids"]

    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [productInfo, setProductInfo] = useState({
        name: "",
        brand: "",
        description: "",
        mrp: "",
        price: "",
        stockQty: "1",
        sizes: "",
        colors: "",
        audiences: [],
        category: "",
    })
    const [customCategory, setCustomCategory] = useState("")
    const [loading, setLoading] = useState(false)

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (!user?.id) throw new Error("Please sign in first.")

            const mrp = Number(productInfo.mrp)
            const price = Number(productInfo.price)
            const stockQty = Number(productInfo.stockQty)
            const name = productInfo.name.trim()
            const description = productInfo.description.trim()
            const brand = productInfo.brand.trim()
            const selectedCategory = productInfo.category.trim()
            const audiences = productInfo.audiences
            const sizes = productInfo.sizes.split(",").map((v) => v.trim()).filter(Boolean)
            const colors = productInfo.colors.split(",").map((v) => v.trim()).filter(Boolean)
            const category =
                selectedCategory === "Others"
                    ? customCategory.trim()
                    : selectedCategory

            if (!name || !brand || !description || !category || audiences.length === 0) {
                throw new Error("Please fill all product details.")
            }
            if (!sizes.length) {
                throw new Error("Please add at least one size.")
            }
            if (Number.isNaN(mrp) || Number.isNaN(price) || mrp <= 0 || price <= 0) {
                throw new Error("Price values must be greater than 0.")
            }
            if (!Number.isInteger(stockQty) || stockQty < 1) {
                throw new Error("Stock quantity must be at least 1.")
            }
            if (price > mrp) {
                throw new Error("Offer price cannot be higher than actual price.")
            }

            const selectedImages = Object.values(images).filter(Boolean)
            if (!selectedImages.length) {
                throw new Error("Please upload at least one product image.")
            }

            const imageData = await uploadMultipleImages(selectedImages)

            const response = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    name,
                    brand,
                    description,
                    mrp,
                    price,
                    stockQty,
                    sizes,
                    colors,
                    images: imageData,
                    audiences,
                    category,
                }),
            })
            const payload = await response.json()
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to add product.")
            }

            setImages({ 1: null, 2: null, 3: null, 4: null })
            setProductInfo({
                name: "",
                brand: "",
                description: "",
                mrp: "",
                price: "",
                stockQty: "1",
                sizes: "",
                colors: "",
                audiences: [],
                category: "",
            })
            setCustomCategory("")
            return "Product added successfully."
        } finally {
            setLoading(false)
        }
    }

    return (
        <form
            onSubmit={e =>
                toast.promise(onSubmitHandler(e), {
                    loading: "Adding Product...",
                    success: (msg) => msg || "Product added successfully.",
                    error: (err) => err?.message || "Failed to add product.",
                })
            }
            className="text-slate-500 mb-28"
        >
            <h1 className="text-2xl">Add New <span className="text-slate-800 font-medium">Products</span></h1>
            <p className="mt-7">Product Images</p>

            <div className="flex gap-3 mt-4">
                {Object.keys(images).map((key) => (
                    <label key={key} htmlFor={`images${key}`}>
                        <Image
                            width={300}
                            height={300}
                            className='h-15 w-auto border border-slate-200 rounded cursor-pointer'
                            src={images[key] ? URL.createObjectURL(images[key]) : assets.upload_area}
                            alt={`Product image ${key}`}
                        />
                        <input
                            type="file"
                            accept='image/*'
                            id={`images${key}`}
                            onChange={e => setImages({ ...images, [key]: e.target.files[0] })}
                            hidden
                        />
                    </label>
                ))}
            </div>

            <label className="flex flex-col gap-2 my-6 ">
                Name
                <input type="text" name="name" onChange={onChangeHandler} value={productInfo.name} placeholder="Enter product name" className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded" required />
            </label>

            <label className="flex flex-col gap-2 my-6 ">
                Brand
                <input type="text" name="brand" onChange={onChangeHandler} value={productInfo.brand} placeholder="Enter brand name (e.g. Nike, Adidas)" className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded" required />
            </label>

            <label className="flex flex-col gap-2 my-6 ">
                Description
                <textarea name="description" onChange={onChangeHandler} value={productInfo.description} placeholder="Enter product description" rows={5} className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
            </label>

            <label className="flex flex-col gap-2 my-6 ">
                Sizes (comma separated)
                <input type="text" name="sizes" onChange={onChangeHandler} value={productInfo.sizes} placeholder="S, M, L, XL" className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded" required />
            </label>

            <label className="flex flex-col gap-2 my-6 ">
                Colors (comma separated, optional)
                <input type="text" name="colors" onChange={onChangeHandler} value={productInfo.colors} placeholder="Black, White, Blue" className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded" />
            </label>

            <div className="flex gap-5">
                <label className="flex flex-col gap-2 ">
                    Actual Price (Rs)
                    <input type="number" min="1" name="mrp" onChange={onChangeHandler} value={productInfo.mrp} placeholder="0" className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
                </label>
                <label className="flex flex-col gap-2 ">
                    Offer Price (Rs)
                    <input type="number" min="1" name="price" onChange={onChangeHandler} value={productInfo.price} placeholder="0" className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
                </label>
                <label className="flex flex-col gap-2 ">
                    Stock Qty
                    <input type="number" min="1" name="stockQty" onChange={onChangeHandler} value={productInfo.stockQty} placeholder="1" className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none" required />
                </label>
            </div>

            <label className="flex flex-col gap-2 my-6">
                Audience
                <div className="w-full max-w-sm flex flex-wrap gap-3 rounded border border-slate-200 p-3">
                    {audienceOptions.map((audience) => {
                        const checked = productInfo.audiences.includes(audience)
                        return (
                            <label key={audience} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                        setProductInfo((prev) => ({
                                            ...prev,
                                            audiences: checked
                                                ? prev.audiences.filter((item) => item !== audience)
                                                : [...prev.audiences, audience],
                                        }))
                                    }
                                />
                                {audience}
                            </label>
                        )
                    })}
                </div>
            </label>

            <label className="flex flex-col gap-2 my-6">
                Category
                <select onChange={e => setProductInfo({ ...productInfo, category: e.target.value })} value={productInfo.category} className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded" required>
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
            </label>
            {productInfo.category === "Others" && (
                <label className="flex flex-col gap-2 mb-6">
                    Custom Category
                    <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Enter category name"
                        className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded"
                        required
                    />
                </label>
            )}

            <br />

            <button disabled={loading} className="bg-slate-800 text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition">Add Product</button>
        </form>
    )
}
