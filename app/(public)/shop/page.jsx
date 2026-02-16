'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import ProductCard from "@/components/ProductCard"
import { MoveLeftIcon, SlidersHorizontal, ArrowLeft } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"
import toast from "react-hot-toast"

const FILTER_SECTIONS = [
    { id: "brand", label: "Brand" },
    { id: "audience", label: "Audience" },
    { id: "price", label: "Price" },
    { id: "ratings", label: "Customer Ratings" },
    { id: "discount", label: "Discount" },
    { id: "availability", label: "Availability" },
    { id: "category", label: "Category" },
    { id: "sort", label: "Sort" },
]

const PRICE_BUCKETS = [
    { label: "Under Rs 500", min: 0, max: 500 },
    { label: "Rs 500 - Rs 1000", min: 500, max: 1000 },
    { label: "Rs 1000 - Rs 2500", min: 1000, max: 2500 },
    { label: "Rs 2500 - Rs 5000", min: 2500, max: 5000 },
    { label: "Above Rs 5000", min: 5000, max: null },
]

const SORT_OPTIONS = [
    { label: "Latest", value: "latest" },
    { label: "Price: Low to High", value: "price_asc" },
    { label: "Price: High to Low", value: "price_desc" },
    { label: "Top Rated", value: "rating_desc" },
]

const parseList = (value) =>
    typeof value === "string"
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : []

const AUDIENCE_VALUES = ["men", "women", "kids"]

const buildFilterStateFromParams = (searchParams) => {
    const categoryParam = searchParams.get("categories") || searchParams.get("category")
    const rawCategories = parseList(categoryParam).map((item) => item.toLowerCase())
    const queryAudiences = parseList(searchParams.get("audiences")).map((item) => item.toLowerCase())
    const derivedAudiences = rawCategories.filter((item) => AUDIENCE_VALUES.includes(item))
    const categories = rawCategories.filter((item) => !AUDIENCE_VALUES.includes(item))
    const minPrice = Number(searchParams.get("minPrice"))
    const maxPriceRaw = searchParams.get("maxPrice")
    const maxPrice = maxPriceRaw === null ? null : Number(maxPriceRaw)
    const minRating = Number(searchParams.get("minRating"))
    const minDiscount = Number(searchParams.get("minDiscount"))

    return {
        brands: parseList(searchParams.get("brands")).map((item) => item.toLowerCase()),
        audiences: Array.from(new Set([...queryAudiences, ...derivedAudiences])),
        categories,
        minPrice: Number.isFinite(minPrice) ? minPrice : null,
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
        minRating: Number.isFinite(minRating) ? minRating : 0,
        minDiscount: Number.isFinite(minDiscount) ? minDiscount : 0,
        inStockOnly: searchParams.get("inStock") === "true",
        sort: searchParams.get("sort") || "",
    }
}

const getDiscountPercent = (product) => {
    const mrp = Number(product?.mrp || 0)
    const price = Number(product?.price || 0)
    if (mrp <= 0 || price <= 0 || price >= mrp) return 0
    return Math.round(((mrp - price) / mrp) * 100)
}

const getRoundedRating = (product) => {
    const ratings = Array.isArray(product?.rating) ? product.rating : []
    if (!ratings.length) return 0

    const avg = ratings.reduce((acc, curr) => acc + (Number(curr?.rating) || 0), 0) / ratings.length
    return Math.round(avg)
}

const getProductBrand = (product) => {
    const explicitBrand = product?.brand?.trim()
    return explicitBrand || ""
}

const getProductAudiences = (product) => {
    const direct = Array.isArray(product?.audiences) ? product.audiences.map((item) => String(item || "").toLowerCase()).filter(Boolean) : []
    if (direct.length > 0) return direct

    const rawCategory = String(product?.category || "").toLowerCase()
    if (rawCategory.startsWith("men -")) return ["men"]
    if (rawCategory.startsWith("women -")) return ["women"]
    if (rawCategory.startsWith("kids -")) return ["kids"]
    return []
}

const categoryTokenSet = (value) =>
    new Set(
        String(value || "")
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .map((part) => part.trim())
            .filter(Boolean)
    )

const filterProducts = (products, filters, searchText) => {
    let result = [...products]

    if (searchText) {
        result = result.filter((product) => {
            const name = (product?.name || "").toLowerCase()
            const category = (product?.category || "").toLowerCase()
            const brand = getProductBrand(product).toLowerCase()
            return name.includes(searchText) || category.includes(searchText) || brand.includes(searchText)
        })
    }

    if (filters.brands.length > 0) {
        const selected = new Set(filters.brands)
        result = result.filter((product) => selected.has(getProductBrand(product).toLowerCase()))
    }

    if (filters.audiences.length > 0) {
        const selected = new Set(filters.audiences)
        result = result.filter((product) => {
            const productAudiences = getProductAudiences(product)
            return productAudiences.some((audience) => selected.has(audience))
        })
    }

    if (filters.categories.length > 0) {
        const selected = new Set(filters.categories)
        result = result.filter((product) => {
            const rawCategory = String(product?.category || "").toLowerCase()
            const tokens = categoryTokenSet(rawCategory)
            for (const wanted of selected) {
                if (rawCategory === wanted || tokens.has(wanted)) return true
            }
            return false
        })
    }

    if (typeof filters.minPrice === "number") {
        result = result.filter((product) => Number(product?.price || 0) >= filters.minPrice)
    }

    if (typeof filters.maxPrice === "number") {
        result = result.filter((product) => Number(product?.price || 0) <= filters.maxPrice)
    }

    if (filters.minRating > 0) {
        result = result.filter((product) => getRoundedRating(product) >= filters.minRating)
    }

    if (filters.minDiscount > 0) {
        result = result.filter((product) => getDiscountPercent(product) >= filters.minDiscount)
    }

    if (filters.inStockOnly) {
        result = result.filter((product) => Boolean(product?.inStock))
    }

    if (filters.sort === "latest") {
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    if (filters.sort === "price_asc") {
        result.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0))
    }

    if (filters.sort === "price_desc") {
        result.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0))
    }

    if (filters.sort === "rating_desc") {
        result.sort((a, b) => getRoundedRating(b) - getRoundedRating(a))
    }

    return result
}

function ShopContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const search = searchParams.get("search")
    const normalizedSearch = (search || "").toLowerCase()

    const products = useSelector((state) => state.product.list)
    const [dbProducts, setDbProducts] = useState([])

    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [activeSection, setActiveSection] = useState("brand")
    const [brandSearch, setBrandSearch] = useState("")
    const [dragOffset, setDragOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const touchStartXRef = useRef(null)

    useEffect(() => {
        const fetchDbProducts = async () => {
            const response = await fetch("/api/products", { cache: "no-store" })
            const payload = await response.json()
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || "Failed to load products.")
            }
            setDbProducts(payload?.data || [])
        }

        fetchDbProducts().catch((error) => {
            toast.error(error?.message || "Failed to load products.")
        })
    }, [])

    const allProducts = useMemo(() => {
        const mapById = new Map()
        ;[...dbProducts, ...products].forEach((product) => {
            if (product?.id) mapById.set(product.id, product)
        })
        return Array.from(mapById.values())
    }, [dbProducts, products])

    const availableBrands = useMemo(() => {
        const seen = new Set()
        const result = []

        allProducts.forEach((product) => {
            const brand = getProductBrand(product)
            if (!brand) return
            const normalized = brand.toLowerCase()
            if (seen.has(normalized)) return
            seen.add(normalized)
            result.push(brand)
        })

        return result.sort((a, b) => a.localeCompare(b))
    }, [allProducts])

    const availableCategories = useMemo(() => {
        const seen = new Set()
        const result = []

        allProducts.forEach((product) => {
            const categoryName = product?.category?.trim()
            if (!categoryName) return
            const normalized = categoryName.toLowerCase()
            if (seen.has(normalized)) return
            seen.add(normalized)
            result.push(categoryName)
        })

        return result.sort((a, b) => a.localeCompare(b))
    }, [allProducts])

    const appliedFilters = useMemo(() => buildFilterStateFromParams(searchParams), [searchParams])

    const [draftFilters, setDraftFilters] = useState(appliedFilters)

    useEffect(() => {
        setDraftFilters(appliedFilters)
    }, [appliedFilters])

    const filteredBrandOptions = useMemo(() => {
        if (!brandSearch.trim()) return availableBrands
        const text = brandSearch.toLowerCase()
        return availableBrands.filter((brand) => brand.toLowerCase().includes(text))
    }, [availableBrands, brandSearch])

    const displayProducts = useMemo(() => {
        return filterProducts(allProducts, appliedFilters, normalizedSearch)
    }, [allProducts, appliedFilters, normalizedSearch])

    const previewCount = useMemo(() => {
        return filterProducts(allProducts, draftFilters, normalizedSearch).length
    }, [allProducts, draftFilters, normalizedSearch])

    const toggleFromList = (field, value) => {
        setDraftFilters((prev) => {
            const exists = prev[field].includes(value)
            return {
                ...prev,
                [field]: exists ? prev[field].filter((item) => item !== value) : [...prev[field], value],
            }
        })
    }

    const clearFilters = () => {
        setDraftFilters({
            brands: [],
            audiences: [],
            categories: [],
            minPrice: null,
            maxPrice: null,
            minRating: 0,
            minDiscount: 0,
            inStockOnly: false,
            sort: "",
        })
        setBrandSearch("")
    }

    const applyFilters = () => {
        const params = new URLSearchParams(searchParams.toString())

        const setOrDelete = (key, value) => {
            if (value === "" || value === null || value === undefined) {
                params.delete(key)
                return
            }
            params.set(key, String(value))
        }

        if (draftFilters.brands.length > 0) params.set("brands", draftFilters.brands.join(","))
        else params.delete("brands")

        if (draftFilters.audiences.length > 0) params.set("audiences", draftFilters.audiences.join(","))
        else params.delete("audiences")

        if (draftFilters.categories.length > 0) {
            params.set("categories", draftFilters.categories.join(","))
            params.delete("category")
        } else {
            params.delete("categories")
            params.delete("category")
        }

        setOrDelete("minPrice", draftFilters.minPrice)
        setOrDelete("maxPrice", draftFilters.maxPrice)
        setOrDelete("minRating", draftFilters.minRating || "")
        setOrDelete("minDiscount", draftFilters.minDiscount || "")
        setOrDelete("sort", draftFilters.sort)

        if (draftFilters.inStockOnly) params.set("inStock", "true")
        else params.delete("inStock")

        const query = params.toString()
        router.push(query ? `/shop?${query}` : "/shop")
        setIsFilterOpen(false)
    }

    const handleTouchStart = (event) => {
        if (!isFilterOpen || typeof window === "undefined" || window.innerWidth >= 640) return
        touchStartXRef.current = event.touches?.[0]?.clientX ?? null
        setIsDragging(false)
    }

    const handleTouchMove = (event) => {
        if (touchStartXRef.current === null) return

        const currentX = event.touches?.[0]?.clientX ?? touchStartXRef.current
        const delta = Math.max(0, currentX - touchStartXRef.current)
        if (delta > 0) {
            setIsDragging(true)
            setDragOffset(Math.min(delta, 360))
        }
    }

    const handleTouchEnd = () => {
        if (touchStartXRef.current === null) return

        const shouldClose = dragOffset > 90
        touchStartXRef.current = null
        setIsDragging(false)
        setDragOffset(0)
        if (shouldClose) setIsFilterOpen(false)
    }

    useEffect(() => {
        if (!isFilterOpen) {
            setIsDragging(false)
            setDragOffset(0)
            touchStartXRef.current = null
        }
    }, [isFilterOpen])

    const backdropOpacity = isFilterOpen ? Math.max(0, 1 - dragOffset / 240) : 0
    const drawerTransform = isFilterOpen ? `translateX(${dragOffset}px)` : "translateX(100%)"

    return (
        <div className="min-h-[70vh] mx-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-4 my-6">
                    <h1
                        onClick={() => router.push('/shop')}
                        className="text-2xl text-slate-500 flex items-center gap-2 cursor-pointer"
                    >
                        {(search || displayProducts.length !== allProducts.length) && <MoveLeftIcon size={20} />}
                        All <span className="text-slate-700 font-medium">Products</span>
                    </h1>

                    <button
                        onClick={() => {
                            setDraftFilters(appliedFilters)
                            setBrandSearch("")
                            setIsFilterOpen(true)
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-md text-sm font-medium text-slate-700 bg-white"
                    >
                        <SlidersHorizontal size={16} />
                        Filters
                    </button>
                </div>

                {displayProducts.length === 0 ? (
                    <div className="text-slate-500 text-sm py-10">No products found for selected filters.</div>
                ) : (
                    <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
                        {displayProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>
                )}
            </div>

            <div className={`fixed inset-0 z-50 ${isFilterOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
                <div
                    onClick={() => setIsFilterOpen(false)}
                    className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isFilterOpen ? "opacity-100" : "opacity-0"}`}
                    style={{ opacity: backdropOpacity }}
                />
                <div
                    className="absolute inset-y-0 right-0 w-full sm:w-[760px] bg-white shadow-xl flex flex-col"
                    style={{
                        transform: drawerTransform,
                        transition: isDragging ? "none" : "transform 300ms ease",
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                >
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200">
                        <button className="inline-flex items-center gap-2" onClick={() => setIsFilterOpen(false)}>
                            <ArrowLeft size={20} />
                            <span className="text-xl font-medium">Filters</span>
                        </button>
                        <button className="text-sm font-medium text-slate-700" onClick={clearFilters}>Clear Filters</button>
                    </div>

                    <div className="grid grid-cols-[150px_1fr] sm:grid-cols-[220px_1fr] min-h-0 flex-1 overflow-hidden">
                        <div className="bg-slate-50 border-r border-slate-200 overflow-y-auto">
                            {FILTER_SECTIONS.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full text-left px-4 py-4 text-sm border-l-2 ${
                                        activeSection === section.id
                                            ? "border-sky-500 bg-white text-slate-900"
                                            : "border-transparent text-slate-700"
                                    }`}
                                >
                                    {section.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto">
                            {activeSection === "brand" && (
                                <div>
                                    <input
                                        value={brandSearch}
                                        onChange={(e) => setBrandSearch(e.target.value)}
                                        placeholder="Search Brand"
                                        className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm outline-none"
                                    />
                                    <p className="text-sm font-semibold text-slate-500 mt-4 mb-3">Popular Filters</p>
                                    <div className="space-y-3">
                                        {filteredBrandOptions.map((brand) => {
                                            const normalized = brand.toLowerCase()
                                            return (
                                                <label key={brand} className="flex items-center gap-3 text-base text-slate-800">
                                                    <input
                                                        type="checkbox"
                                                        className="size-5"
                                                        checked={draftFilters.brands.includes(normalized)}
                                                        onChange={() => toggleFromList("brands", normalized)}
                                                    />
                                                    {brand}
                                                </label>
                                            )
                                        })}
                                        {filteredBrandOptions.length === 0 && (
                                            <p className="text-sm text-slate-500">No matching brand found.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeSection === "audience" && (
                                <div className="space-y-3">
                                    {AUDIENCE_VALUES.map((audience) => (
                                        <label key={audience} className="flex items-center gap-3 text-base text-slate-800 capitalize">
                                            <input
                                                type="checkbox"
                                                className="size-5"
                                                checked={draftFilters.audiences.includes(audience)}
                                                onChange={() => toggleFromList("audiences", audience)}
                                            />
                                            {audience}
                                        </label>
                                    ))}
                                </div>
                            )}

                            {activeSection === "price" && (
                                <div className="space-y-3">
                                    {PRICE_BUCKETS.map((bucket) => {
                                        const checked =
                                            draftFilters.minPrice === bucket.min && draftFilters.maxPrice === bucket.max
                                        return (
                                            <label key={bucket.label} className="flex items-center gap-3 text-base text-slate-800">
                                                <input
                                                    type="radio"
                                                    name="priceRange"
                                                    className="size-5"
                                                    checked={checked}
                                                    onChange={() =>
                                                        setDraftFilters((prev) => ({
                                                            ...prev,
                                                            minPrice: bucket.min,
                                                            maxPrice: bucket.max,
                                                        }))
                                                    }
                                                />
                                                {bucket.label}
                                            </label>
                                        )
                                    })}
                                    <button
                                        onClick={() =>
                                            setDraftFilters((prev) => ({ ...prev, minPrice: null, maxPrice: null }))
                                        }
                                        className="text-sm text-sky-700 font-medium"
                                    >
                                        Reset Price
                                    </button>
                                </div>
                            )}

                            {activeSection === "ratings" && (
                                <div className="space-y-3">
                                    {[4, 3, 2].map((value) => (
                                        <label key={value} className="flex items-center gap-3 text-base text-slate-800">
                                            <input
                                                type="radio"
                                                name="ratings"
                                                className="size-5"
                                                checked={draftFilters.minRating === value}
                                                onChange={() => setDraftFilters((prev) => ({ ...prev, minRating: value }))}
                                            />
                                            {value} stars & above
                                        </label>
                                    ))}
                                    <button
                                        onClick={() => setDraftFilters((prev) => ({ ...prev, minRating: 0 }))}
                                        className="text-sm text-sky-700 font-medium"
                                    >
                                        Reset Ratings
                                    </button>
                                </div>
                            )}

                            {activeSection === "discount" && (
                                <div className="space-y-3">
                                    {[10, 25, 40, 60].map((value) => (
                                        <label key={value} className="flex items-center gap-3 text-base text-slate-800">
                                            <input
                                                type="radio"
                                                name="discount"
                                                className="size-5"
                                                checked={draftFilters.minDiscount === value}
                                                onChange={() =>
                                                    setDraftFilters((prev) => ({ ...prev, minDiscount: value }))
                                                }
                                            />
                                            {value}% or more
                                        </label>
                                    ))}
                                    <button
                                        onClick={() => setDraftFilters((prev) => ({ ...prev, minDiscount: 0 }))}
                                        className="text-sm text-sky-700 font-medium"
                                    >
                                        Reset Discount
                                    </button>
                                </div>
                            )}

                            {activeSection === "availability" && (
                                <label className="flex items-center gap-3 text-base text-slate-800">
                                    <input
                                        type="checkbox"
                                        className="size-5"
                                        checked={draftFilters.inStockOnly}
                                        onChange={() =>
                                            setDraftFilters((prev) => ({ ...prev, inStockOnly: !prev.inStockOnly }))
                                        }
                                    />
                                    In stock only
                                </label>
                            )}

                            {activeSection === "category" && (
                                <div className="space-y-3">
                                    {availableCategories.map((categoryName) => {
                                        const normalized = categoryName.toLowerCase()
                                        return (
                                            <label key={categoryName} className="flex items-center gap-3 text-base text-slate-800">
                                                <input
                                                    type="checkbox"
                                                    className="size-5"
                                                    checked={draftFilters.categories.includes(normalized)}
                                                    onChange={() => toggleFromList("categories", normalized)}
                                                />
                                                {categoryName}
                                            </label>
                                        )
                                    })}
                                </div>
                            )}

                            {activeSection === "sort" && (
                                <div className="space-y-3">
                                    {SORT_OPTIONS.map((option) => (
                                        <label key={option.value} className="flex items-center gap-3 text-base text-slate-800">
                                            <input
                                                type="radio"
                                                className="size-5"
                                                name="sort"
                                                checked={draftFilters.sort === option.value}
                                                onChange={() => setDraftFilters((prev) => ({ ...prev, sort: option.value }))}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                    <button
                                        onClick={() => setDraftFilters((prev) => ({ ...prev, sort: "" }))}
                                        className="text-sm text-sky-700 font-medium"
                                    >
                                        Reset Sort
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                        <p className="text-sm sm:text-base text-slate-700">
                            <span className="font-semibold">{previewCount}</span> products found
                        </p>
                        <button
                            onClick={applyFilters}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-2.5 rounded-md"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function Shop() {
    return (
        <Suspense fallback={<div>Loading shop...</div>}>
            <ShopContent />
        </Suspense>
    )
}
