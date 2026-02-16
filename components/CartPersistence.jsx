'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useDispatch, useSelector } from 'react-redux'
import { deleteItemsFromCart, setCartState, setItemQuantity } from '@/lib/features/cart/cartSlice'
import toast from 'react-hot-toast'
import { usePathname } from 'next/navigation'
import { parseVariantKey } from '@/lib/cartKey'

const CART_KEY_PREFIX = 'tsm_cart_'
const LEGACY_GUEST_KEY = 'tsm_cart'

const getCartKey = (userId) => `${CART_KEY_PREFIX}${userId || 'guest'}`

const readCart = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export default function CartPersistence() {
  const dispatch = useDispatch()
  const cartItems = useSelector((state) => state.cart.cartItems)
  const { isLoaded, user } = useUser()
  const pathname = usePathname()

  const activeKey = useMemo(() => {
    if (!isLoaded) return null
    return getCartKey(user?.id || null)
  }, [isLoaded, user?.id])

  const hydratedKeyRef = useRef(null)
  const syncingRef = useRef(false)
  const lastSyncedSignatureRef = useRef("")
  const forceSyncRef = useRef(false)
  const [syncTick, setSyncTick] = useState(0)

  useEffect(() => {
    if (!activeKey) return

    const storedCart = readCart(activeKey)

    if (!storedCart && user?.id) {
      const guestCart = readCart(getCartKey(null)) || readCart(LEGACY_GUEST_KEY)
      if (guestCart) {
        localStorage.setItem(activeKey, JSON.stringify(guestCart))
      }
    }

    const finalCart = readCart(activeKey)
    dispatch(setCartState(finalCart || {}))
    hydratedKeyRef.current = activeKey
    lastSyncedSignatureRef.current = ""
  }, [activeKey, dispatch, user?.id])

  useEffect(() => {
    if (!activeKey) return
    if (hydratedKeyRef.current !== activeKey) return
    localStorage.setItem(activeKey, JSON.stringify(cartItems || {}))
  }, [activeKey, cartItems])

  useEffect(() => {
    if (!isLoaded) return
    const hasCartItems = Object.keys(cartItems || {}).length > 0
    if (!hasCartItems) return

    const intervalId = window.setInterval(() => {
      forceSyncRef.current = true
      setSyncTick((prev) => prev + 1)
    }, 60000)

    const handleFocusOrVisible = () => {
      if (document.visibilityState !== 'visible') return
      forceSyncRef.current = true
      setSyncTick((prev) => prev + 1)
    }

    window.addEventListener('focus', handleFocusOrVisible)
    document.addEventListener('visibilitychange', handleFocusOrVisible)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocusOrVisible)
      document.removeEventListener('visibilitychange', handleFocusOrVisible)
    }
  }, [isLoaded, cartItems])

  useEffect(() => {
    const syncCartStock = async () => {
      if (!isLoaded) return
      const entries = Object.entries(cartItems || {})
      if (!entries.length) {
        lastSyncedSignatureRef.current = ""
        return
      }
      if (syncingRef.current) return

      const ids = [...new Set(entries.map(([cartKey]) => parseVariantKey(cartKey).productId).filter(Boolean))].sort()
      if (!ids.length) return
      const quantities = entries
        .map(([cartKey, qty]) => `${cartKey}:${Number(qty || 0)}`)
        .sort()
      const signature = `${ids.join(",")}|${quantities.join(",")}`
      if (signature === lastSyncedSignatureRef.current && !forceSyncRef.current) return

      syncingRef.current = true
      try {
        const response = await fetch(
          `/api/products/stock?ids=${encodeURIComponent(ids.join(","))}`,
          { cache: 'no-store' }
        )
        const payload = await response.json()
        if (!response.ok || !payload?.success || !Array.isArray(payload?.data)) return

        const productsById = new Map(payload.data.map((item) => [item.id, item]))
        const outOfStockIds = []
        const adjustedItems = []

        entries.forEach(([cartKey, qty]) => {
          const { productId } = parseVariantKey(cartKey)
          const product = productsById.get(productId)
          if (!product) return

          const stockQty = Number(product.stockQty || 0)
          const isInStock = Boolean(product.inStock) && stockQty > 0
          const quantity = Number(qty || 0)

          if (!isInStock) {
            outOfStockIds.push(cartKey)
            return
          }

          if (quantity > stockQty) {
            adjustedItems.push({ productId: cartKey, cartKey, quantity: stockQty })
          }
        })

        if (outOfStockIds.length) {
          dispatch(deleteItemsFromCart({ productIds: outOfStockIds }))
          if (pathname === '/cart') {
            toast.error(`${outOfStockIds.length} out-of-stock item(s) removed from cart.`)
          }
        }

        if (adjustedItems.length) {
          adjustedItems.forEach((item) => dispatch(setItemQuantity(item)))
          if (pathname === '/cart') {
            toast('Some cart quantities were adjusted to available stock.', { icon: 'i' })
          }
        }

        lastSyncedSignatureRef.current = signature
        forceSyncRef.current = false
      } catch {
        // keep silent; checkout API still validates stock
      } finally {
        syncingRef.current = false
      }
    }

    syncCartStock()
  }, [cartItems, dispatch, isLoaded, pathname, syncTick])

  return null
}
