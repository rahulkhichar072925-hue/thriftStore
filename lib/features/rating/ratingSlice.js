import { createSlice } from '@reduxjs/toolkit'

const upsert = (list, item) => {
    const index = list.findIndex(
        (rating) =>
            rating.orderId === item.orderId &&
            rating.productId === item.productId &&
            rating.userId === item.userId
    )

    if (index === -1) {
        list.push(item)
        return
    }

    list[index] = { ...list[index], ...item }
}

const ratingSlice = createSlice({
    name: 'rating',
    initialState: {
        ratings: [],
    },
    reducers: {
        addRating: (state, action) => {
            upsert(state.ratings, action.payload)
        },
        setRatings: (state, action) => {
            const incoming = Array.isArray(action.payload) ? action.payload : []
            state.ratings = incoming
        },
    }
})

export const { addRating, setRatings } = ratingSlice.actions

export default ratingSlice.reducer
