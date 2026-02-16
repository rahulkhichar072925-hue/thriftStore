'use client'
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { useUser } from "@clerk/nextjs"
import { PencilIcon, Trash2Icon, XIcon } from "lucide-react"

const initialEditState = {
    id: "",
    name: "",
    brand: "",
    description: "",
    audiences: [],
    sizes: "",
    colors: "",
    category: "",
    customCategory: "",
    mrp: "",
    price: "",
    stockQty: "1",
    image1: "",
    image2: "",
    image3: "",
    image4: "",
}

const categoryOptions = ["Shoes", "Clothing", "Jackets", "Running Shoes", "Golf Shoes", "Sports & Outdoors", "Topwear", "Winter Jacket", "Hoodies", "Others"]
const audienceOptions = ["Men", "Women", "Kids"]

const parseAudienceAndCategory = (product) => {
    const rawCategory = String(product?.category || "").trim()
    const dbAudiences = Array.isArray(product?.audiences) ? product.audiences.filter(Boolean) : []

    if (dbAudiences.length > 0) {
        const isKnownCategory = categoryOptions.includes(rawCategory)
        return {
            audiences: dbAudiences,
            category: isKnownCategory ? rawCategory : "Others",
            customCategory: isKnownCategory ? "" : rawCategory,
        }
    }

    if (!rawCategory) {
        return { audiences: [], category: "", customCategory: "" }
    }

    const parts = rawCategory.split(" - ").map((part) => part.trim()).filter(Boolean)
    const first = parts[0] || ""
    const second = parts.slice(1).join(" - ").trim()
    const hasKnownAudience = audienceOptions.includes(first)
    const baseCategory = hasKnownAudience ? second : rawCategory
    const isKnownCategory = categoryOptions.includes(baseCategory)
    const audiences = hasKnownAudience ? [first] : []

    if (!baseCategory) {
        return { audiences, category: "", customCategory: "" }
    }

    if (isKnownCategory && baseCategory !== "Others") {
        return { audiences, category: baseCategory, customCategory: "" }
    }

    return { audiences, category: "Others", customCategory: baseCategory }
}

const getProductAudiences = (product) => {
    const dbAudiences = Array.isArray(product?.audiences) ? product.audiences.filter(Boolean) : []
    if (dbAudiences.length > 0) return dbAudiences

    const value = String(product?.category || "").trim()
    const [first] = value.split(" - ").map((item) => item.trim())
    if (audienceOptions.includes(first)) {
        return [first]
    }
    return []
}

export default function StoreManageProducts() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "Rs"
    const { isLoaded, isSignedIn, user } = useUser()

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState("")
    const [stockFilter, setStockFilter] = useState("all")
    const [audienceFilter, setAudienceFilter] = useState("all")
    const [page, setPage] = useState(1)
    const pageSize = 8
    const [editProduct, setEditProduct] = useState(initialEditState)
    const [initialEditSnapshot, setInitialEditSnapshot] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase()
        return products.filter((item) => {
            const matchesSearch =
                !query ||
                String(item?.name || "").toLowerCase().includes(query) ||
                String(item?.category || "").toLowerCase().includes(query) ||
                String(item?.description || "").toLowerCase().includes(query)

            const matchesStock =
                stockFilter === "all" ||
                (stockFilter === "in" && Boolean(item?.inStock)) ||
                (stockFilter === "out" && !Boolean(item?.inStock))

            const productAudience = getProductAudiences(item).map((audience) => audience.toLowerCase())
            const matchesAudience =
                audienceFilter === "all" ||
                (audienceFilter === "unknown" && productAudience.length === 0) ||
                productAudience.includes(audienceFilter)

            return matchesSearch && matchesStock && matchesAudience
        })
    }, [products, search, stockFilter, audienceFilter])

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
    const paginatedProducts = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredProducts.slice(start, start + pageSize)
    }, [filteredProducts, page])

    const fetchProducts = async () => {
        if (!user?.id) {
            setProducts([])
            setLoading(false)
            return
        }

        const response = await fetch(`/api/products?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to fetch products.")
        }
        setProducts(payload?.data || [])
        setLoading(false)
    }

    const toggleStock = async (product) => {
        const response = await fetch(`/api/products/${product.id}/stock`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inStock: !product.inStock }),
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to update stock.")
        }

        setProducts((prev) => prev.map((item) => (item.id === product.id ? payload.data : item)))
        return payload?.message || "Stock updated."
    }

    const deleteProduct = async (product) => {
        const response = await fetch(`/api/products/${product.id}`, {
            method: "DELETE",
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to remove product.")
        }
        setProducts((prev) => prev.filter((item) => item.id !== product.id))
        return payload?.message || "Product removed."
    }

    const openEditModal = (product) => {
        const images = Array.isArray(product?.images) ? product.images : []
        const parsed = {
            id: product.id,
            name: product.name || "",
            brand: product.brand || "Unbranded",
            description: product.description || "",
            sizes: Array.isArray(product.sizes) ? product.sizes.join(", ") : "",
            colors: Array.isArray(product.colors) ? product.colors.join(", ") : "",
            ...parseAudienceAndCategory(product),
            mrp: String(product.mrp ?? ""),
            price: String(product.price ?? ""),
            stockQty: String(product.stockQty ?? 1),
            image1: images[0] || "",
            image2: images[1] || "",
            image3: images[2] || "",
            image4: images[3] || "",
        }
        setEditProduct(parsed)
        setInitialEditSnapshot(parsed)
        setShowEditModal(true)
    }

    const closeEditModal = () => {
        setShowEditModal(false)
        setEditProduct(initialEditState)
        setInitialEditSnapshot(null)
    }

    const handleEditChange = (e) => {
        setEditProduct((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const getNormalizedEditPayload = (state) => {
        const images = [state.image1, state.image2, state.image3, state.image4]
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        const selectedAudiences = Array.isArray(state.audiences)
            ? state.audiences.filter(Boolean)
            : []
        const selectedCategory = String(state.category || "").trim()
        const customCategory = String(state.customCategory || "").trim()
        const finalCategory = selectedCategory === "Others" ? customCategory : selectedCategory

        return {
            name: String(state.name || "").trim(),
            brand: String(state.brand || "").trim(),
            description: String(state.description || "").trim(),
            audiences: [...selectedAudiences].sort(),
            sizes: String(state.sizes || "").split(",").map((v) => v.trim()).filter(Boolean),
            colors: String(state.colors || "").split(",").map((v) => v.trim()).filter(Boolean),
            category: finalCategory,
            mrp: Number(state.mrp),
            price: Number(state.price),
            stockQty: Number(state.stockQty),
            images,
        }
    }

    const isEditDirty = useMemo(() => {
        if (!initialEditSnapshot) return false
        const current = getNormalizedEditPayload(editProduct)
        const initial = getNormalizedEditPayload(initialEditSnapshot)
        return JSON.stringify(current) !== JSON.stringify(initial)
    }, [editProduct, initialEditSnapshot])

    const submitProductUpdate = async (e) => {
        e.preventDefault()
        if (!editProduct.id) throw new Error("Invalid product.")
        const payload = getNormalizedEditPayload(editProduct)

        if (payload.audiences.length === 0 || !payload.category) {
            throw new Error("Audience and category are required.")
        }
        if ((payload.sizes || []).length === 0) {
            throw new Error("At least one size is required.")
        }
        if (!Number.isInteger(payload.stockQty) || payload.stockQty < 0) {
            throw new Error("Stock quantity must be 0 or greater.")
        }

        const response = await fetch(`/api/products/${editProduct.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        const data = await response.json()
        if (!response.ok || !data?.success) {
            throw new Error(data?.message || "Failed to update product.")
        }

        setProducts((prev) => prev.map((item) => (item.id === editProduct.id ? data.data : item)))
        closeEditModal()
        return data?.message || "Product updated."
    }

    useEffect(() => {
        if (!isLoaded) return
        if (!isSignedIn) {
            setLoading(false)
            return
        }

        fetchProducts().catch((error) => {
            toast.error(error?.message || "Failed to fetch products.")
            setLoading(false)
        })
    }, [isLoaded, isSignedIn, user?.id])

    useEffect(() => {
        setPage(1)
    }, [search, stockFilter, audienceFilter])

    useEffect(() => {
        if (page > totalPages) setPage(totalPages)
    }, [page, totalPages])

    if (loading) return <Loading />

    return (
        <>
            <div className="mb-5 flex items-start justify-between gap-4 max-md:flex-col">
                <h1 className="text-2xl text-slate-500">Manage <span className="text-slate-800 font-medium">Products</span></h1>
                <div className="flex items-center gap-2 max-sm:flex-col w-full md:w-auto">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name/category"
                        className="w-full md:w-64 rounded border border-slate-300 px-3 py-2 text-sm outline-slate-400"
                    />
                    <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="w-full md:w-40 rounded border border-slate-300 px-3 py-2 text-sm outline-slate-400"
                    >
                        <option value="all">All Stock</option>
                        <option value="in">In Stock</option>
                        <option value="out">Out of Stock</option>
                    </select>
                    <select
                        value={audienceFilter}
                        onChange={(e) => setAudienceFilter(e.target.value)}
                        className="w-full md:w-40 rounded border border-slate-300 px-3 py-2 text-sm outline-slate-400"
                    >
                        <option value="all">All Audience</option>
                        <option value="men">Men</option>
                        <option value="women">Women</option>
                        <option value="kids">Kids</option>
                        <option value="unknown">Unspecified</option>
                    </select>
                </div>
            </div>

            <table className="w-full max-w-4xl text-left ring ring-slate-200 rounded overflow-hidden text-sm">
                <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3 hidden lg:table-cell">Product ID</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3 hidden md:table-cell">Audience</th>
                        <th className="px-4 py-3 hidden md:table-cell">Brand</th>
                        <th className="px-4 py-3 hidden md:table-cell">Description</th>
                        <th className="px-4 py-3 hidden md:table-cell">MRP</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3 hidden md:table-cell">Stock</th>
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {paginatedProducts.map((product) => (
                        <tr
                            key={product.id}
                            className={`border-t border-gray-200 hover:bg-gray-50 ${Number(product.stockQty || 0) <= 0
                                    ? "bg-rose-50/60"
                                    : Number(product.stockQty || 0) <= 5
                                        ? "bg-amber-50/60"
                                        : ""
                                }`}
                        >
                            <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs text-slate-500">
                                {product.id}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex gap-2 items-center">
                                    <Image width={40} height={40} className="p-1 shadow rounded cursor-pointer" src={product.images?.[0]} alt={product.name} />
                                    {product.name}
                                </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                                {getProductAudiences(product).join(", ") || "-"}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">{product.brand || "Unbranded"}</td>
                            <td className="px-4 py-3 max-w-md text-slate-600 hidden md:table-cell truncate">
                                {product.description}
                                {(Array.isArray(product.sizes) && product.sizes.length > 0) || (Array.isArray(product.colors) && product.colors.length > 0) ? (
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {Array.isArray(product.sizes) && product.sizes.length > 0 ? `Size: ${product.sizes.join(", ")}` : ""}
                                        {Array.isArray(product.sizes) && product.sizes.length > 0 && Array.isArray(product.colors) && product.colors.length > 0 ? " | " : ""}
                                        {Array.isArray(product.colors) && product.colors.length > 0 ? `Color: ${product.colors.join(", ")}` : ""}
                                    </p>
                                ) : null}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">{currency} {Number(product.mrp || 0).toLocaleString()}</td>
                            <td className="px-4 py-3">{currency} {Number(product.price || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 hidden md:table-cell">
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${Number(product.stockQty || 0) <= 0
                                            ? "bg-rose-100 text-rose-700"
                                            : Number(product.stockQty || 0) <= 5
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-emerald-100 text-emerald-700"
                                        }`}
                                >
                                    {Number(product.stockQty || 0)}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            onChange={() =>
                                                toast.promise(toggleStock(product), {
                                                    loading: "Updating data...",
                                                    success: (msg) => msg || "Stock updated.",
                                                    error: (err) => err?.message || "Failed to update stock.",
                                                })
                                            }
                                            checked={Boolean(product.inStock)}
                                        />
                                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                                        <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => openEditModal(product)}
                                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition"
                                        title="Edit product"
                                    >
                                        <PencilIcon size={16} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            toast.promise(deleteProduct(product), {
                                                loading: "Removing product...",
                                                success: (msg) => msg || "Product removed.",
                                                error: (err) => err?.message || "Failed to remove product.",
                                            })
                                        }
                                        className="text-red-500 hover:bg-red-50 p-2 rounded-full transition"
                                        title="Delete product"
                                    >
                                        <Trash2Icon size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {paginatedProducts.length === 0 && (
                        <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-slate-400">No products found.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between max-w-4xl text-sm text-slate-600 max-sm:flex-col max-sm:gap-2">
                <p>
                    Showing {paginatedProducts.length ? (page - 1) * pageSize + 1 : 0}
                    {" "}to{" "}
                    {(page - 1) * pageSize + paginatedProducts.length} of {filteredProducts.length}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                    >
                        Prev
                    </button>
                    <span>Page {page} / {totalPages}</span>
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>

            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px] p-4">
                    <form
                        onSubmit={(e) =>
                            toast.promise(submitProductUpdate(e), {
                                loading: "Updating product...",
                                success: (msg) => msg || "Product updated.",
                                error: (err) => err?.message || "Failed to update product.",
                            })
                        }
                        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">Edit Product</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Update product details, pricing and images</p>
                            </div>
                            <button type="button" onClick={closeEditModal} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200">
                                <XIcon size={18} />
                            </button>
                        </div>

                        <div className="px-6 py-5 max-h-[72vh] overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Product Name</p>
                                    <input name="name" value={editProduct.name} onChange={handleEditChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="Product name" required />
                                </label>
                                <label className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Brand (Company)</p>
                                    <input name="brand" value={editProduct.brand} onChange={handleEditChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="Brand (company)" required />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-lg border border-slate-300 px-3 py-2.5">
                                    <p className="text-xs font-medium text-slate-500 mb-2">Audience</p>
                                    <div className="flex flex-wrap gap-4">
                                        {audienceOptions.map((audience) => {
                                            const checked = editProduct.audiences.includes(audience)
                                            return (
                                                <label key={audience} className="flex items-center gap-2 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() =>
                                                            setEditProduct((prev) => ({
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
                                </div>

                                <label className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Category</p>
                                    <select name="category" value={editProduct.category} onChange={handleEditChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" required>
                                        <option value="">Select Category</option>
                                        {categoryOptions.map((category) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            {editProduct.category === "Others" && (
                                <label className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Custom Category</p>
                                    <input
                                        name="customCategory"
                                        value={editProduct.customCategory}
                                        onChange={handleEditChange}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400"
                                        placeholder="Custom category"
                                        required
                                    />
                                </label>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">MRP ({currency})</p>
                                    <input name="mrp" type="number" min="1" value={editProduct.mrp} onChange={handleEditChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="MRP" required />
                                </label>
                                <label className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Offer Price ({currency})</p>
                                    <input name="price" type="number" min="1" value={editProduct.price} onChange={handleEditChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="Price" required />
                                </label>
                                <label className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Stock Quantity</p>
                                    <input name="stockQty" type="number" min="0" value={editProduct.stockQty} onChange={handleEditChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="Stock qty" required />
                                </label>
                            </div>

                            <label className="space-y-1 block">
                                <p className="text-xs font-medium text-slate-500">Description</p>
                                <textarea name="description" value={editProduct.description} onChange={handleEditChange} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400 resize-none" placeholder="Description" required />
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Sizes (comma separated)</p>
                                    <input name="sizes" value={editProduct.sizes} onChange={handleEditChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="S, M, L, XL" required />
                                </label>
                                <label className="space-y-1">
                                    <p className="text-xs font-medium text-slate-500">Colors (comma separated)</p>
                                    <input name="colors" value={editProduct.colors} onChange={handleEditChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="Black, White, Blue" />
                                </label>
                            </div>

                            <div className="rounded-lg border border-slate-200 p-3">
                                <p className="text-xs font-medium text-slate-500 mb-2">Image URLs</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input name="image1" value={editProduct.image1} onChange={handleEditChange} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="Image URL 1 (required)" required />
                                    <input name="image2" value={editProduct.image2} onChange={handleEditChange} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="Image URL 2 (optional)" />
                                    <input name="image3" value={editProduct.image3} onChange={handleEditChange} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="Image URL 3 (optional)" />
                                    <input name="image4" value={editProduct.image4} onChange={handleEditChange} className="rounded-lg border border-slate-300 px-3 py-2.5 outline-slate-400" placeholder="Image URL 4 (optional)" />
                                </div>
                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[editProduct.image1, editProduct.image2, editProduct.image3, editProduct.image4].map((src, index) => (
                                        <div key={index} className="aspect-square rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                                            {String(src || "").trim() ? (
                                                <Image
                                                    src={src}
                                                    alt={`Preview ${index + 1}`}
                                                    width={120}
                                                    height={120}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-[11px] text-slate-400">No image</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 bg-white px-6 py-4 flex justify-end gap-2">
                            <button type="button" onClick={closeEditModal} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button type="submit" disabled={!isEditDirty} className="rounded-lg bg-slate-800 px-4 py-2 text-white enabled:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
