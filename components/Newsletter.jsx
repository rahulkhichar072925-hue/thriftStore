'use client'
import React, { useState } from 'react'
import Title from './Title'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/client/apiError'

const Newsletter = () => {
    const [email, setEmail] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const subscribe = async (e) => {
        e.preventDefault()
        const cleanEmail = email.trim().toLowerCase()

        if (!cleanEmail) {
            toast.error('Please enter your email address.')
            return
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(cleanEmail)) {
            toast.error('Please enter a valid email address.')
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail }),
            })

            const payload = await response.json()
            if (!response.ok || !payload?.success) {
                throw new Error(getApiErrorMessage(response, payload, 'Unable to subscribe right now.'))
            }

            setEmail('')
            toast.success(payload?.message || 'Subscribed successfully. You will get updates soon.')
        } catch (error) {
            toast.error(error?.message || 'Unable to subscribe right now. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className='flex flex-col items-center mx-4 my-36'>
            <Title title='Join Newsletter' description='Subscribe to get exclusive deals, new arrivals, and insider updates delivered straight to your inbox every week.' visibleButton={false} />
            <form onSubmit={subscribe} className='flex bg-slate-100 text-sm p-1 rounded-full w-full max-w-xl my-10 border-2 border-white ring ring-slate-200'>
                <input
                    className='flex-1 pl-5 outline-none bg-transparent'
                    type='email'
                    placeholder='Enter your email address'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <button
                    type='submit'
                    disabled={submitting}
                    className='font-medium bg-green-500 text-white px-7 py-3 rounded-full hover:scale-103 active:scale-95 transition disabled:opacity-70 disabled:cursor-not-allowed'
                >
                    {submitting ? 'Submitting...' : 'Get Updates'}
                </button>
            </form>
        </div>
    )
}

export default Newsletter