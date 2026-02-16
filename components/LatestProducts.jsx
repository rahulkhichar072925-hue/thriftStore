'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

const LatestProducts = () => {

    const displayQuantity = 4
    const products = useSelector(state => state.product.list)
    const [dbProducts, setDbProducts] = useState([])

    useEffect(() => {
        const fetchDbProducts = async () => {
            const response = await fetch('/api/products', { cache: 'no-store' })
            const payload = await response.json()
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || 'Failed to load latest products.')
            }
            setDbProducts(payload?.data || [])
        }

        fetchDbProducts().catch((error) => {
            toast.error(error?.message || 'Failed to load latest products.')
        })
    }, [])

    const mergedProducts = useMemo(() => {
        const mapById = new Map()
        ;[...dbProducts, ...products].forEach((product) => {
            if (product?.id) mapById.set(product.id, product)
        })
        return Array.from(mapById.values())
    }, [dbProducts, products])

    const latestProducts = useMemo(
        () => mergedProducts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, displayQuantity),
        [mergedProducts]
    )

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Latest Products' description={`Showing ${mergedProducts.length < displayQuantity ? mergedProducts.length : displayQuantity} of ${mergedProducts.length} products`} href='/shop?sort=latest' />
            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
                {latestProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default LatestProducts
