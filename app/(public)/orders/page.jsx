'use client'
import PageTitle from "@/components/PageTitle"
import { useEffect, useState } from "react";
import OrderItem from "@/components/OrderItem";
import toast from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { useDispatch } from "react-redux";
import { setRatings } from "@/lib/features/rating/ratingSlice";
import { getApiErrorMessage } from "@/lib/client/apiError";

export default function Orders() {
    const { isLoaded, isSignedIn, user } = useUser();
    const dispatch = useDispatch();
    const [orders, setOrders] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn || !user?.id) {
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            const [ordersResponse, ratingsResponse, complaintsResponse, returnsResponse] = await Promise.all([
                fetch(`/api/orders?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" }),
                fetch(`/api/ratings`, { cache: "no-store" }),
                fetch(`/api/complaints`, { cache: "no-store" }),
                fetch(`/api/returns`, { cache: "no-store" }),
            ]);

            const ordersPayload = await ordersResponse.json();
            const ratingsPayload = await ratingsResponse.json();
            const complaintsPayload = await complaintsResponse.json();
            const returnsPayload = await returnsResponse.json();

            if (!ordersResponse.ok || !ordersPayload?.success) {
                throw new Error(ordersPayload?.message || "Failed to fetch orders.");
            }

            if (ratingsResponse.ok && ratingsPayload?.success) {
                dispatch(setRatings(ratingsPayload?.data || []));
            }

            if (complaintsResponse.ok && complaintsPayload?.success) {
                setComplaints(complaintsPayload?.data || []);
            }
            if (returnsResponse.ok && returnsPayload?.success) {
                setReturns(returnsPayload?.data || []);
            }

            setOrders(ordersPayload?.data || []);
            setLoading(false);
        };

        fetchOrders().catch((error) => {
            toast.error(error?.message || "Failed to load orders.");
            setLoading(false);
        });
    }, [dispatch, isLoaded, isSignedIn, user]);

    const handleCancelOrder = async (orderId) => {
        if (!user?.id) throw new Error("Please login.");

        const response = await fetch(`/api/orders/${orderId}?userId=${encodeURIComponent(user.id)}`, {
            method: "DELETE",
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
            throw new Error(getApiErrorMessage(response, payload, "Failed to cancel order."));
        }

        setOrders((prev) => prev.filter((item) => item.id !== orderId));
        return payload?.message || "Order cancelled.";
    };

    const handleComplaint = async ({ orderId, productId, subject, description }) => {
        const response = await fetch("/api/complaints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, productId, subject, description }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
            throw new Error(getApiErrorMessage(response, payload, "Failed to submit complaint."));
        }

        setComplaints((prev) => [payload.data, ...prev]);
        return payload?.message || "Complaint submitted.";
    };
    const handleReturn = async ({ orderId, productId, reason, description }) => {
        const response = await fetch("/api/returns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId,
                productId,
                reason,
                description: description || "Return requested by customer.",
            }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
            throw new Error(getApiErrorMessage(response, payload, "Failed to submit return request."));
        }

        setReturns((prev) => [payload.data, ...prev]);
        return payload?.message || "Return request submitted.";
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                <h1 className="text-2xl sm:text-4xl font-semibold">Loading orders...</h1>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                <h1 className="text-2xl sm:text-4xl font-semibold">Please login to view your orders</h1>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] mx-6">
            {orders.length > 0 ? (
                <div className="my-20 max-w-7xl mx-auto">
                    <PageTitle heading="My Orders" text={`Showing total ${orders.length} orders`} linkText={'Go to home'} />

                    <table className="w-full max-w-5xl text-slate-500 table-auto border-separate border-spacing-y-12 border-spacing-x-4">
                        <thead>
                            <tr className="max-sm:text-sm text-slate-600 max-md:hidden">
                                <th className="text-left">Product</th>
                                <th className="text-center">Total Price</th>
                                <th className="text-left">Address</th>
                                <th className="text-left">Status</th>
                                <th className="text-left">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <OrderItem
                                    order={order}
                                    key={order.id}
                                    complaints={complaints}
                                    returns={returns}
                                    onComplain={handleComplaint}
                                    onReturn={handleReturn}
                                    onCancel={() =>
                                        toast.promise(handleCancelOrder(order.id), {
                                            loading: "Cancelling order...",
                                            success: (msg) => msg || "Order cancelled.",
                                            error: (err) => err?.message || "Failed to cancel order.",
                                        })
                                    }
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                    <h1 className="text-2xl sm:text-4xl font-semibold">You have no orders</h1>
                </div>
            )}
        </div>
    );
}
