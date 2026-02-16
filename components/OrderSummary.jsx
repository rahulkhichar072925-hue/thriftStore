'use client';

import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import AddressModal from './AddressModal';
import { couponDummyData } from '@/assets/assets';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { clearCart } from '@/lib/features/cart/cartSlice';
import { useUser } from '@clerk/nextjs';
import { getApiErrorMessage } from '@/lib/client/apiError';

const OrderSummary = ({ totalPrice, items }) => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '?';
    const router = useRouter();
    const dispatch = useDispatch();
    const { isSignedIn, user } = useUser();
    const addressList = useSelector((state) => state.address.list);

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);
    const [showOrderPlacedModal, setShowOrderPlacedModal] = useState(false);
    const [selectedOnlineMethod, setSelectedOnlineMethod] = useState('UPI');
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
    const [availableCoupons, setAvailableCoupons] = useState(couponDummyData);
    const [walletBalance, setWalletBalance] = useState(0);
    const [useWallet, setUseWallet] = useState(false);

    const shippingCharge = totalPrice >= 1500 ? 0 : 250;
    const discountAmount = coupon ? (coupon.discount / 100) * totalPrice : 0;
    const preWalletTotal = Math.max(0, totalPrice - discountAmount + shippingCharge);
    const walletDebit = useWallet ? Math.min(walletBalance, preWalletTotal) : 0;
    const finalTotal = Math.max(0, preWalletTotal - walletDebit);
    const hasStockIssue = (items || []).some(
        (item) =>
            !item?.inStock ||
            Number(item?.stockQty || 0) <= 0 ||
            Number(item?.quantity || 0) > Number(item?.stockQty || 0)
    );

    const handleCouponCode = async (event) => {
        event.preventDefault();
        const code = couponCodeInput.trim().toUpperCase();
        if (!code) throw new Error('Enter coupon code.');

        const matchedCoupon = availableCoupons.find((item) => item.code?.toUpperCase() === code);
        if (!matchedCoupon) throw new Error('Invalid coupon code.');
        if (new Date(matchedCoupon.expiresAt) < new Date()) throw new Error('Coupon expired.');

        setCoupon(matchedCoupon);
        setCouponCodeInput('');
        return 'Coupon applied.';
    };

    const validateCheckout = () => {
        if (!isSignedIn || !user?.id) {
            window.dispatchEvent(new Event('tsm_open_login'));
            throw new Error('Please login to place order.');
        }
        if (!selectedAddress) throw new Error('Please select address.');
        if (!items?.length) throw new Error('Cart is empty.');

        const outOfStockItem = items.find((item) => !item?.inStock || Number(item?.stockQty || 0) <= 0);
        if (outOfStockItem) {
            throw new Error(`"${outOfStockItem.name}" is out of stock. Remove it from cart first.`);
        }

        const overQtyItem = items.find((item) => Number(item?.quantity || 0) > Number(item?.stockQty || 0));
        if (overQtyItem) {
            throw new Error(`"${overQtyItem.name}" quantity exceeds stock. Reduce quantity to continue.`);
        }
    };

    const submitOrder = async (method = paymentMethod) => {
        const resolvedWalletDebit =
            method === 'WALLET' ? preWalletTotal : walletDebit;
        const payload = {
            userId: user.id,
            userName: user.fullName || user.username || 'User',
            userEmail: user.primaryEmailAddress?.emailAddress || 'user@example.com',
            userImage: user.imageUrl || '/favicon.ico',
            paymentMethod: method,
            address: selectedAddress,
            cartItems: items.map((item) => ({
                productId: item.id,
                quantity: item.quantity,
                size: item.selectedSize || "",
                color: item.selectedColor || "",
                variantKey: item.cartKey || "",
            })),
            coupon: coupon
                ? {
                      code: coupon.code,
                      description: coupon.description,
                      discount: coupon.discount,
                  }
                : null,
            shippingCharge,
            walletDebit: resolvedWalletDebit,
        };

        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
            throw new Error(getApiErrorMessage(response, data, 'Failed to place order.'));
        }

        dispatch(clearCart());
        setCoupon('');
        setShowOnlinePaymentModal(false);
        return data?.message || 'Order placed.';
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        validateCheckout();

        if (paymentMethod === 'STRIPE') {
            setShowOnlinePaymentModal(true);
            return 'Select payment method.';
        }

        await submitOrder('COD');
        setShowOrderPlacedModal(true);
        return 'Order placed.';
    };

    const handleConfirmOnlinePayment = async () => {
        validateCheckout();
        const onlineMethodLabel = `ONLINE_${selectedOnlineMethod}`;
        if (selectedOnlineMethod === 'WALLET') {
            if (walletBalance <= 0) {
                throw new Error('Wallet balance is insufficient.');
            }
            if (walletBalance < preWalletTotal) {
                throw new Error('Wallet balance is not enough to cover this order.');
            }
            setUseWallet(true);
            await submitOrder('WALLET');
        } else {
            await submitOrder(onlineMethodLabel);
        }
        setShowOrderPlacedModal(true);
        return 'Order placed.';
    };

    const openOrdersPage = () => {
        setShowOrderPlacedModal(false);
        router.push('/orders');
    };

    const continueShopping = () => {
        setShowOrderPlacedModal(false);
        router.push('/shop');
    };

    const onPlaceOrderClick = (e) => {
        if (paymentMethod === 'STRIPE') {
            handlePlaceOrder(e).catch((error) => toast.error(error?.message || 'Unable to continue.'));
            return;
        }
        handlePlaceOrder(e).catch((error) => toast.error(error?.message || 'Unable to place order.'));
    };

    React.useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const response = await fetch('/api/coupons?active=true', { cache: 'no-store' });
                const payload = await response.json();
                if (response.ok && payload?.success && Array.isArray(payload.data)) {
                    setAvailableCoupons(payload.data);
                    return;
                }
            } catch {}
            setAvailableCoupons(couponDummyData);
        };

        fetchCoupons();
    }, []);

    useEffect(() => {
        const fetchWallet = async () => {
            const response = await fetch('/api/wallet', { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok || !payload?.success) return;
            setWalletBalance(Number(payload?.data?.balance || 0));
        };

        if (isSignedIn) {
            fetchWallet().catch(() => {});
        }
    }, [isSignedIn]);

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>Payment Summary</h2>
            <p className='text-slate-400 text-xs my-4'>Payment Method</p>
            <div className='flex gap-2 items-center'>
                <input type='radio' id='COD' onChange={() => setPaymentMethod('COD')} checked={paymentMethod === 'COD'} className='accent-gray-500' />
                <label htmlFor='COD' className='cursor-pointer'>
                    COD
                </label>
            </div>
            <div className='flex gap-2 items-center mt-1'>
                <input type='radio' id='STRIPE' name='payment' onChange={() => setPaymentMethod('STRIPE')} checked={paymentMethod === 'STRIPE'} className='accent-gray-500' />
                <label htmlFor='STRIPE' className='cursor-pointer'>
                    Online Payment
                </label>
            </div>
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p>Address</p>
                {selectedAddress ? (
                    <div className='flex gap-2 items-center'>
                        <p>
                            {selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.zip}
                        </p>
                        <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer' size={18} />
                    </div>
                ) : (
                    <div>
                        {addressList.length > 0 && (
                            <select className='border border-slate-400 p-2 w-full my-3 outline-none rounded' onChange={(e) => setSelectedAddress(addressList[e.target.value])}>
                                <option value=''>Select Address</option>
                                {addressList.map((address, index) => (
                                    <option key={index} value={index}>
                                        {address.name}, {address.city}, {address.state}, {address.zip}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button className='flex items-center gap-1 text-slate-600 mt-1' onClick={() => setShowAddressModal(true)}>
                            Add Address <PlusIcon size={18} />
                        </button>
                    </div>
                )}
            </div>
            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>Subtotal:</p>
                        <p>Shipping:</p>
                        {coupon && <p>Coupon:</p>}
                        {useWallet && walletDebit > 0 && <p>Wallet:</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>
                            {currency}
                            {totalPrice.toLocaleString()}
                        </p>
                        <p>{shippingCharge === 0 ? 'Free' : `${currency}${shippingCharge}`}</p>
                        {coupon && <p>{`-${currency}${discountAmount.toFixed(2)}`}</p>}
                        {useWallet && walletDebit > 0 && <p>{`-${currency}${walletDebit.toFixed(2)}`}</p>}
                    </div>
                </div>
                {!coupon ? (
                    <form onSubmit={(e) => toast.promise(handleCouponCode(e), { loading: 'Checking Coupon...' })} className='flex justify-center gap-3 mt-3'>
                        <input onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type='text' placeholder='Coupon Code' className='border border-slate-400 p-1.5 rounded w-full outline-none' />
                        <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>Apply</button>
                    </form>
                ) : (
                    <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                        <p>
                            Code: <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span>
                        </p>
                        <p>{coupon.description}</p>
                        <XIcon
                            size={18}
                            onClick={() => {
                                setCoupon('');
                                setCouponCodeInput('');
                            }}
                            className='hover:text-red-700 transition cursor-pointer'
                        />
                    </div>
                )}
            </div>
            {isSignedIn && (
                <label className='flex items-center gap-2 text-xs text-slate-600 mt-3'>
                    <input
                        type='checkbox'
                        checked={useWallet}
                        onChange={() => setUseWallet((prev) => !prev)}
                    />
                    Use wallet balance (Available: {currency}{walletBalance.toFixed(2)})
                </label>
            )}
            <div className='flex justify-between py-4'>
                <p>Total:</p>
                <p className='font-medium text-right'>
                    {currency}
                    {finalTotal.toFixed(2)}
                </p>
            </div>
            <button
                onClick={onPlaceOrderClick}
                disabled={hasStockIssue}
                className='w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed disabled:active:scale-100'
            >
                Place Order
            </button>
            {hasStockIssue && <p className='mt-2 text-xs text-rose-600'>Some cart items are unavailable. Fix cart stock to place order.</p>}

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}

            {showOnlinePaymentModal && (
                <div className='fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4'>
                    <div className='w-full max-w-md rounded-xl bg-white p-5 shadow-xl'>
                        <h3 className='text-lg font-semibold text-slate-700'>Choose Online Payment Method</h3>
                        <p className='mt-1 text-xs text-slate-400'>Select one method and continue.</p>

                        <div className='mt-4 space-y-2'>
                            {['UPI', 'CARD', 'NETBANKING', 'WALLET'].map((method) => (
                                <label key={method} className='flex items-center gap-2 rounded-lg border border-slate-200 p-3 cursor-pointer'>
                                    <input
                                        type='radio'
                                        name='onlineMethod'
                                        checked={selectedOnlineMethod === method}
                                        onChange={() => {
                                            setSelectedOnlineMethod(method);
                                            if (method === 'WALLET') setUseWallet(true);
                                        }}
                                    />
                                    <span className='text-slate-600'>{method}</span>
                                </label>
                            ))}
                        </div>

                        <div className='mt-5 flex justify-end gap-2'>
                            <button
                                type='button'
                                onClick={() => setShowOnlinePaymentModal(false)}
                                className='rounded-lg border border-slate-300 px-4 py-2 text-slate-600'
                            >
                                Cancel
                            </button>
                            <button
                                type='button'
                                onClick={() => {
                                    toast.promise(handleConfirmOnlinePayment(), {
                                        loading: 'Processing payment...',
                                        error: (err) => err?.message || 'Payment failed.',
                                    });
                                }}
                                className='rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-900'
                            >
                                Pay & Place Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showOrderPlacedModal && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
                    <div className='w-full max-w-md rounded-xl bg-white p-5 shadow-xl'>
                        <h3 className='text-lg font-semibold text-slate-800'>Order Placed Successfully</h3>
                        <p className='mt-2 text-sm text-slate-500'>
                            Your order has been placed. You can now track it from your orders page.
                        </p>
                        <div className='mt-5 flex justify-end gap-2'>
                            <button
                                type='button'
                                onClick={continueShopping}
                                className='rounded-lg border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50'
                            >
                                Continue Shopping
                            </button>
                            <button
                                type='button'
                                onClick={openOrdersPage}
                                className='rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-900'
                            >
                                View Orders
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default OrderSummary;