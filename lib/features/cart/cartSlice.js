import { createSlice } from '@reduxjs/toolkit'

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        total: 0,
        cartItems: {},
    },
    reducers: {
        setCartState: (state, action) => {
            const incomingItems = action.payload && typeof action.payload === 'object' ? action.payload : {}
            state.cartItems = {}
            state.total = 0

            Object.entries(incomingItems).forEach(([productId, quantity]) => {
                const parsedQty = Number(quantity)
                if (!productId || !Number.isFinite(parsedQty) || parsedQty <= 0) return
                const safeQty = Math.floor(parsedQty)
                state.cartItems[productId] = safeQty
                state.total += safeQty
            })
        },
        addToCart: (state, action) => {
            const cartKey = action.payload?.cartKey || action.payload?.productId
            if (!cartKey) return
            if (state.cartItems[cartKey]) {
                state.cartItems[cartKey]++
            } else {
                state.cartItems[cartKey] = 1
            }
            state.total += 1
        },
        removeFromCart: (state, action) => {
            const cartKey = action.payload?.cartKey || action.payload?.productId
            if (!cartKey) return
            if (state.cartItems[cartKey]) {
                state.cartItems[cartKey]--
                if (state.cartItems[cartKey] === 0) {
                    delete state.cartItems[cartKey]
                }
                state.total -= 1
            }
        },
        deleteItemFromCart: (state, action) => {
            const cartKey = action.payload?.cartKey || action.payload?.productId
            if (!cartKey) return
            state.total -= state.cartItems[cartKey] ? state.cartItems[cartKey] : 0
            delete state.cartItems[cartKey]
        },
        deleteItemsFromCart: (state, action) => {
            const ids = Array.isArray(action.payload?.productIds) ? action.payload.productIds : []
            ids.forEach((cartKey) => {
                if (!cartKey) return
                const qty = state.cartItems[cartKey] ? Number(state.cartItems[cartKey]) : 0
                if (qty > 0) {
                    state.total -= qty
                    delete state.cartItems[cartKey]
                }
            })
            if (state.total < 0) state.total = 0
        },
        setItemQuantity: (state, action) => {
            const productId = action.payload?.cartKey || action.payload?.productId
            const quantity = Number(action.payload?.quantity || 0)
            if (!productId) return

            const prevQty = state.cartItems[productId] ? Number(state.cartItems[productId]) : 0

            if (!Number.isFinite(quantity) || quantity <= 0) {
                if (prevQty > 0) {
                    state.total -= prevQty
                    delete state.cartItems[productId]
                }
                if (state.total < 0) state.total = 0
                return
            }

            const nextQty = Math.floor(quantity)
            state.cartItems[productId] = nextQty
            state.total += nextQty - prevQty
            if (state.total < 0) state.total = 0
        },
        clearCart: (state) => {
            state.cartItems = {}
            state.total = 0
        },
    }
})

export const {
    addToCart,
    removeFromCart,
    clearCart,
    deleteItemFromCart,
    deleteItemsFromCart,
    setItemQuantity,
    setCartState
} = cartSlice.actions

export default cartSlice.reducer
