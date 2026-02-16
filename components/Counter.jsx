'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";

const Counter = ({ productId, cartKey, maxQty, onMaxReached }) => {

    const { cartItems } = useSelector(state => state.cart);
    const key = cartKey || productId

    const dispatch = useDispatch();

    const addToCartHandler = () => {
        const currentQty = Number(cartItems[key] || 0)
        if (Number.isInteger(maxQty) && maxQty >= 0 && currentQty >= maxQty) {
            if (typeof onMaxReached === "function") onMaxReached()
            return
        }
        dispatch(addToCart({ productId, cartKey: key }))
    }

    const removeFromCartHandler = () => {
        dispatch(removeFromCart({ productId, cartKey: key }))
    }

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={removeFromCartHandler} className="p-1 select-none">-</button>
            <p className="p-1">{cartItems[key]}</p>
            <button
                onClick={addToCartHandler}
                className="p-1 select-none disabled:opacity-40"
                disabled={Number.isInteger(maxQty) && maxQty >= 0 && Number(cartItems[key] || 0) >= maxQty}
            >
                +
            </button>
        </div>
    )
}

export default Counter
