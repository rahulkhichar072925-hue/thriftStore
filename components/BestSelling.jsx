'use client'
import Title from './Title'
import ProductCard from './ProductCard'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

const BestSelling = () => {

    const displayQuantity = 8
    const products = useSelector(state => state.product.list)
    const [dbProducts, setDbProducts] = useState([])
    const [randomProducts, setRandomProducts] = useState([])

    useEffect(() => {
        const fetchDbProducts = async () => {
            const response = await fetch('/api/products', { cache: 'no-store' })
            const payload = await response.json()
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || 'Failed to load best selling products.')
            }
            setDbProducts(payload?.data || [])
        }

        fetchDbProducts().catch((error) => {
            toast.error(error?.message || 'Failed to load best selling products.')
        })
    }, [])

    const mergedProducts = useMemo(() => {
        const mapById = new Map()
        ;[...dbProducts, ...products].forEach((product) => {
            if (product?.id) mapById.set(product.id, product)
        })
        return Array.from(mapById.values())
    }, [dbProducts, products])

    useEffect(() => {
        const list = mergedProducts.slice()
        for (let i = list.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[list[i], list[j]] = [list[j], list[i]]
        }
        setRandomProducts(list.slice(0, displayQuantity))
    }, [mergedProducts])

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Best Selling' description={`Showing ${mergedProducts.length < displayQuantity ? mergedProducts.length : displayQuantity} of ${mergedProducts.length} products`} href='/shop' />
            <div className='mt-12  grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12'>
                {randomProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default BestSelling
