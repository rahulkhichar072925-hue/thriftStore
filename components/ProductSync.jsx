'use client'

import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { setProduct } from "@/lib/features/product/productSlice"

const ProductSync = () => {
    const dispatch = useDispatch()

    useEffect(() => {
        const fetchProducts = async () => {
            const response = await fetch("/api/products", { cache: "no-store" })
            const payload = await response.json()
            if (!response.ok || !payload?.success) return
            dispatch(setProduct(payload?.data || []))
        }

        fetchProducts()

        const handleRefresh = () => {
            fetchProducts()
        }

        window.addEventListener("tsm_products_refresh", handleRefresh)
        return () => window.removeEventListener("tsm_products_refresh", handleRefresh)
    }, [dispatch])

    return null
}

export default ProductSync
