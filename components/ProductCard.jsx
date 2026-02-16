'use client'
import { StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const ProductCard = ({ product }) => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'
    const ratings = Array.isArray(product?.rating) ? product.rating : []
    const rating = ratings.length
        ? Math.round((ratings.reduce((acc, curr) => acc + (curr?.rating || 0), 0) / ratings.length) * 10) / 10
        : 0
    const mrp = Number(product?.mrp || 0)
    const price = Number(product?.price || 0)
    const hasDiscount = mrp > price && price > 0
    const discountPercent = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0
    const inferredBrand = String(product?.brand || product?.name || '')
        .split(/[\s-]/)
        .filter(Boolean)[0] || 'Brand'
    const audienceList = Array.isArray(product?.audiences)
        ? product.audiences.filter(Boolean)
        : []
    const normalizedCategory = String(product?.category || '').toLowerCase()
    const fallbackAudience =
        normalizedCategory.startsWith('men -') ? ['Men'] :
        normalizedCategory.startsWith('women -') ? ['Women'] :
        normalizedCategory.startsWith('kids -') ? ['Kids'] : []
    const audiences = audienceList.length ? audienceList : fallbackAudience
    const stockQty = Number(product?.stockQty || 0)
    const isInStock = Boolean(product?.inStock) && stockQty > 0
    const isLowStock = isInStock && stockQty <= 3

    return (
        <Link
            href={`/product/${product.id}`}
            className='group block w-full max-w-60 max-xl:mx-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition'
        >
            <div className='relative bg-[#F5F5F5] h-44 sm:h-60 rounded-lg flex items-center justify-center overflow-hidden'>
                <Image
                    width={500}
                    height={500}
                    className='max-h-36 sm:max-h-44 w-auto group-hover:scale-110 transition duration-300'
                    src={product.images?.[0]}
                    alt={product?.name || 'Product'}
                />
                {hasDiscount && (
                    <span className='absolute top-2 left-2 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white'>
                        {discountPercent}% OFF
                    </span>
                )}
                {!isInStock && (
                    <span className='absolute top-2 right-2 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white'>
                        Out of Stock
                    </span>
                )}
                {isLowStock && (
                    <span className='absolute top-2 right-2 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white'>
                        Only {stockQty} left
                    </span>
                )}
            </div>

            <div className='pt-3 px-1'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-500'>{inferredBrand}</p>
                <p className='text-sm font-medium text-slate-800 line-clamp-2 min-h-10'>{product.name}</p>
                <p className='text-xs text-slate-500 mt-0.5'>{product.category || 'Category'}</p>
                {audiences.length > 0 && (
                    <div className='mt-1.5 flex flex-wrap gap-1'>
                        {audiences.map((audience) => (
                            <span key={audience} className='rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600'>
                                {audience}
                            </span>
                        ))}
                    </div>
                )}

                <div className='mt-2 flex items-center justify-between'>
                    <div className='flex items-center gap-0.5'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={13} className='text-transparent' fill={rating >= index + 1 ? '#00C950' : '#D1D5DB'} />
                        ))}
                        <span className='ml-1 text-xs text-slate-500'>{rating || '0.0'}</span>
                    </div>

                    <div className='text-right'>
                        <p className='text-sm font-semibold text-slate-800'>
                            {currency}
                            {price.toLocaleString()}
                        </p>
                        {hasDiscount && (
                            <p className='text-xs text-slate-400 line-through'>
                                {currency}
                                {mrp.toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}

export default ProductCard
