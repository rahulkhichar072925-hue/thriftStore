'use client'

import { Star } from 'lucide-react';
import React, { useState } from 'react'
import { XIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { addRating } from '@/lib/features/rating/ratingSlice';

const RatingModal = ({ ratingModal, setRatingModal }) => {

    const dispatch = useDispatch();
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');

    const handleSubmit = async () => {
        if (!rating || rating < 1 || rating > 5) {
            throw new Error('Please select a rating');
        }
        const normalizedReview = review.trim();

        const response = await fetch('/api/ratings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: ratingModal?.orderId,
                productId: ratingModal?.productId,
                rating,
                review: normalizedReview || 'Good product',
            }),
        });

        const payload = await response.json();
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || 'Failed to submit rating.');
        }

        dispatch(addRating(payload.data));
        window.dispatchEvent(
            new CustomEvent('tsm_rating_submitted', {
                detail: { rating: payload.data },
            })
        );
        window.dispatchEvent(new Event('tsm_products_refresh'));
        setRatingModal(null);
        return payload?.message || 'Rating submitted successfully.';
    }

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/10'>
            <div className='bg-white p-8 rounded-lg shadow-lg w-96 relative'>
                <button onClick={() => setRatingModal(null)} className='absolute top-3 right-3 text-gray-500 hover:text-gray-700'>
                    <XIcon size={20} />
                </button>
                <h2 className='text-xl font-medium text-slate-600 mb-4'>Rate Product</h2>
                <div className='flex items-center justify-center mb-4'>
                    {Array.from({ length: 5 }, (_, i) => (
                        <Star
                            key={i}
                            className={`size-8 cursor-pointer ${rating > i ? "text-green-400 fill-current" : "text-gray-300"}`}
                            onClick={() => setRating(i + 1)}
                        />
                    ))}
                </div>
                <textarea
                    className='w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-green-400'
                    placeholder='Write your review (optional)'
                    rows='4'
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                ></textarea>
                <button onClick={e => toast.promise(handleSubmit(), { loading: 'Submitting...', success: (msg) => msg || 'Rating submitted.', error: (err) => err?.message || 'Failed to submit rating.' })} className='w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition'>
                    Submit Rating
                </button>
            </div>
        </div>
    )
}

export default RatingModal
