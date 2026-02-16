'use client'

import React from 'react'
import Title from './Title'
import { ourSpecsData } from '@/assets/assets'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const OurSpecs = () => {
    const router = useRouter()

    const handleSpecAction = (title) => {
        const key = String(title || '').toLowerCase()

        if (key.includes('free shipping')) {
            toast.success('Free shipping is available on orders above Rs 1500.')
            router.push('/shop')
            return
        }

        if (key.includes('return')) {
            toast('You can request return from your orders page within 7 days.')
            router.push('/orders')
            return
        }

        if (key.includes('support')) {
            window.location.href = 'mailto:support@thriftstore.com?subject=ThriftStore%20Support'
            return
        }
    }

    return (
        <div className='px-6 my-20 max-w-6xl mx-auto'>
            <Title visibleButton={false} title='Our Specifications' description='We offer top-tier service and convenience to ensure your shopping experience is smooth, secure and completely hassle-free.' />

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 gap-y-10 mt-26'>
                {ourSpecsData.map((spec, index) => (
                    <button
                        type='button'
                        onClick={() => handleSpecAction(spec.title)}
                        className='relative h-44 px-8 flex flex-col items-center justify-center w-full text-center border rounded-lg group cursor-pointer hover:-translate-y-1 transition'
                        style={{ backgroundColor: spec.accent + 10, borderColor: spec.accent + 30 }}
                        key={index}
                    >
                        <h3 className='text-slate-800 font-medium'>{spec.title}</h3>
                        <p className='text-sm text-slate-600 mt-3'>{spec.description}</p>
                        <div className='absolute -top-5 text-white size-10 flex items-center justify-center rounded-md group-hover:scale-105 transition' style={{ backgroundColor: spec.accent }}>
                            <spec.icon size={20} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default OurSpecs
