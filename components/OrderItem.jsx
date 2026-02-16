'use client'
import Image from "next/image";
import { DotIcon } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useMemo, useState } from "react";
import RatingModal from "./RatingModal";
import toast from "react-hot-toast";

const trackingSteps = ["ORDER_PLACED", "PROCESSING", "SHIPPED", "DELIVERED"];
const parseTimeline = (timeline) =>
    Array.isArray(timeline)
        ? timeline
            .map((entry) => ({
                status: String(entry?.status || "").toUpperCase(),
                at: String(entry?.at || ""),
            }))
            .filter((entry) => entry.status)
        : []

const OrderItem = ({ order, onCancel, complaints = [], returns = [], onComplain, onReturn }) => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "Rs";
    const [ratingModal, setRatingModal] = useState(null);
    const [complaintModal, setComplaintModal] = useState(null);
    const [returnModal, setReturnModal] = useState(null);
    const [showTracking, setShowTracking] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [complaintForm, setComplaintForm] = useState({ subject: "", description: "" });
    const [returnForm, setReturnForm] = useState({ reason: "", description: "" });

    const { ratings } = useSelector((state) => state.rating);
    const statusValue = String(order.status || "").toUpperCase();
    const statusClass =
        statusValue === "DELIVERED"
            ? "text-green-500 bg-green-100"
            : statusValue === "PROCESSING" || statusValue === "SHIPPED"
                ? "text-yellow-500 bg-yellow-100"
                : "text-slate-500 bg-slate-100";

    const canCancel = statusValue === "ORDER_PLACED" || statusValue === "PROCESSING";
    const deliveredAt = (() => {
        const timeline = Array.isArray(order?.statusTimeline) ? order.statusTimeline : [];
        const delivered = timeline.find(
            (entry) => String(entry?.status || "").toUpperCase() === "DELIVERED"
        );
        if (delivered?.at) {
            const date = new Date(delivered.at);
            if (!Number.isNaN(date.getTime())) return date;
        }
        return new Date(order?.updatedAt || order?.createdAt);
    })();
    const withinReturnWindow = deliveredAt && !Number.isNaN(deliveredAt.getTime())
        ? Date.now() - deliveredAt.getTime() <= 7 * 24 * 60 * 60 * 1000
        : false;
    const canReturn = statusValue === "DELIVERED" && withinReturnWindow;
    const currentStepIndex = Math.max(0, trackingSteps.indexOf(statusValue));
    const timelineMap = new Map(
        parseTimeline(order?.statusTimeline).map((entry) => [entry.status, entry.at])
    )
    const submittedComplaintProductIds = useMemo(
        () =>
            new Set(
                complaints
                    .filter((complaint) => complaint?.orderId === order.id)
                    .map((complaint) => complaint?.productId)
            ),
        [complaints, order.id]
    );
    const submittedReturnProductIds = useMemo(
        () =>
            new Set(
                returns
                    .filter((returnItem) => returnItem?.orderId === order.id)
                    .map((returnItem) => returnItem?.productId)
            ),
        [returns, order.id]
    );

    const resetComplaintModal = () => {
        setComplaintModal(null);
        setComplaintForm({ subject: "", description: "" });
    };
    const resetReturnModal = () => {
        setReturnModal(null);
        setReturnForm({ reason: "", description: "" });
    };

    return (
        <>
            <tr className="text-sm">
                <td className="text-left">
                    <div className="flex flex-col gap-6">
                        {order.orderItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md">
                                    <Image
                                        className="h-14 w-auto"
                                        src={item.product.images[0]}
                                        alt={item.product.name || "product image"}
                                        width={50}
                                        height={50}
                                    />
                                </div>
                                <div className="flex flex-col justify-center text-sm">
                                    <p className="font-medium text-slate-600 text-base">{item.product.name}</p>
                                    {(item.size || item.color) && (
                                        <p className="text-xs text-slate-500">
                                            {item.size ? `Size: ${item.size}` : ""}
                                            {item.size && item.color ? " | " : ""}
                                            {item.color ? `Color: ${item.color}` : ""}
                                        </p>
                                    )}
                                    <p>{currency}{item.price} Qty : {item.quantity}</p>
                                    <p className="mb-1">{new Date(order.createdAt).toDateString()}</p>
                                    <div>
                                        {ratings.find((rating) => order.id === rating.orderId && item.product.id === rating.productId) ? (
                                            <Rating value={ratings.find((rating) => order.id === rating.orderId && item.product.id === rating.productId).rating} />
                                        ) : (
                                            <button onClick={() => setRatingModal({ orderId: order.id, productId: item.product.id })} className="text-green-500 hover:bg-green-50 transition">
                                                Rate Product
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-1">
                                        {submittedComplaintProductIds.has(item.product.id) ? (
                                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                                                Complaint Submitted
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setComplaintModal({ orderId: order.id, productId: item.product.id, productName: item.product.name })}
                                                className="text-red-600 hover:bg-red-50 transition"
                                            >
                                                Report Issue
                                            </button>
                                        )}
                                    </div>
                                    {submittedReturnProductIds.has(item.product.id) ? (
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
                                                Return Requested
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => window.location.assign("/account/returns")}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                Track
                                            </button>
                                        </div>
                                    ) : canReturn && (
                                        <div className="mt-1">
                                            <button
                                                type="button"
                                                onClick={() => setReturnModal({ orderId: order.id, productId: item.product.id, productName: item.product.name })}
                                                className="text-slate-700 hover:bg-slate-50 transition"
                                            >
                                                Request Return
                                            </button>
                                        </div>
                                    )}
                                    {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </td>

                <td className="text-center max-md:hidden">{currency}{order.total}</td>

                <td className="text-left max-md:hidden">
                    <p>{order.address.name}, {order.address.street},</p>
                    <p>{order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country},</p>
                    <p>{order.address.phone}</p>
                </td>

                <td className="text-left space-y-2 text-sm max-md:hidden">
                    <div className={`flex items-center justify-center gap-1 rounded-full p-1 ${statusClass}`}>
                        <DotIcon size={10} className="scale-250" />
                        {statusValue.split("_").join(" ").toLowerCase()}
                    </div>
                </td>

                <td className="text-left max-md:hidden">
                    <div className="flex flex-col items-start gap-2">
                        <button
                            type="button"
                            onClick={() => setShowTracking((prev) => !prev)}
                            className="text-blue-600 hover:underline"
                        >
                            {showTracking ? "Hide Tracking" : "Track Order"}
                        </button>
                        {canCancel && (
                            <button
                                type="button"
                                onClick={() => setShowCancelModal(true)}
                                className="text-red-600 hover:underline"
                            >
                                Cancel Order
                            </button>
                        )}
                        {canReturn && (
                            <button
                                type="button"
                                onClick={() => setReturnModal({ orderId: order.id })}
                                className="text-slate-700 hover:underline"
                            >
                                Request Return
                            </button>
                        )}
                    </div>
                </td>
            </tr>

            {showTracking && (
                <tr className="max-md:hidden">
                    <td colSpan={5}>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-sm text-slate-600 mb-2">Tracking Status</p>
                            <div className="grid grid-cols-4 gap-2">
                                {trackingSteps.map((step, index) => {
                                    const isDone = index <= currentStepIndex;
                                    return (
                                        <div
                                            key={step}
                                            className={`rounded p-2 text-center text-xs ${isDone ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                                        >
                                            <p>{step.replace(/_/g, " ").toLowerCase()}</p>
                                            <p className="mt-1 text-[10px] opacity-80">
                                                {timelineMap.get(step)
                                                    ? new Date(timelineMap.get(step)).toLocaleString()
                                                    : "pending"}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </td>
                </tr>
            )}

            <tr className="md:hidden">
                <td colSpan={5}>
                    <p>{order.address.name}, {order.address.street}</p>
                    <p>{order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country}</p>
                    <p>{order.address.phone}</p>
                    <br />
                    <div className="flex items-center mb-3">
                        <span className="text-center mx-auto px-6 py-1.5 rounded bg-green-100 text-green-700">
                            {statusValue.replace(/_/g, " ").toLowerCase()}
                        </span>
                    </div>
                    <div className="flex items-center justify-center gap-5">
                        <button type="button" onClick={() => setShowTracking((prev) => !prev)} className="text-blue-600 text-sm">
                            {showTracking ? "Hide Tracking" : "Track Order"}
                        </button>
                        {canCancel && (
                            <button
                                type="button"
                                onClick={() => setShowCancelModal(true)}
                                className="text-red-600 text-sm"
                            >
                                Cancel Order
                            </button>
                        )}
                        {canReturn && (
                            <button
                                type="button"
                                onClick={() => setReturnModal({ orderId: order.id })}
                                className="text-slate-700 text-sm"
                            >
                                Return
                            </button>
                        )}
                    </div>
                    {showTracking && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-xs text-slate-600 mb-2 text-center">Tracking Status</p>
                            <div className="grid grid-cols-2 gap-2">
                                {trackingSteps.map((step, index) => {
                                    const isDone = index <= currentStepIndex;
                                    return (
                                        <div
                                            key={step}
                                            className={`rounded p-2 text-center text-xs ${isDone ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                                        >
                                            <p>{step.replace(/_/g, " ").toLowerCase()}</p>
                                            <p className="mt-1 text-[10px] opacity-80">
                                                {timelineMap.get(step)
                                                    ? new Date(timelineMap.get(step)).toLocaleString()
                                                    : "pending"}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </td>
            </tr>

            <tr>
                <td colSpan={5}>
                    <div className="border-b border-slate-300 w-6/7 mx-auto" />
                </td>
            </tr>

            {showCancelModal && (
                <tr>
                    <td colSpan={5}>
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                                <h3 className="text-lg font-semibold text-slate-800">Cancel This Order?</h3>
                                <p className="mt-2 text-sm text-slate-500">
                                    This action cannot be undone. Your order will be removed from active orders.
                                </p>
                                <div className="mt-5 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCancelModal(false)}
                                        className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50"
                                    >
                                        Keep Order
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCancelModal(false);
                                            onCancel?.();
                                        }}
                                        className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                                    >
                                        Yes, Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}

            {complaintModal && (
                <tr>
                    <td colSpan={5}>
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                            <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
                                <h3 className="text-lg font-semibold text-slate-800">Report Product Issue</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Product: <span className="font-medium text-slate-700">{complaintModal.productName}</span>
                                </p>

                                <div className="mt-4 space-y-3">
                                    <input
                                        type="text"
                                        value={complaintForm.subject}
                                        onChange={(e) => setComplaintForm((prev) => ({ ...prev, subject: e.target.value }))}
                                        placeholder="Issue title (e.g. Wrong size delivered)"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                    />
                                    <textarea
                                        value={complaintForm.description}
                                        onChange={(e) => setComplaintForm((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Describe your issue in detail"
                                        rows={4}
                                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>

                                <div className="mt-5 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={resetComplaintModal}
                                        className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!complaintForm.subject.trim() || !complaintForm.description.trim()) {
                                                toast.error("Please fill issue title and description.");
                                                return;
                                            }

                                            toast.promise(
                                                onComplain?.({
                                                    orderId: complaintModal.orderId,
                                                    productId: complaintModal.productId,
                                                    subject: complaintForm.subject,
                                                    description: complaintForm.description,
                                                }),
                                                {
                                                    loading: "Submitting complaint...",
                                                    success: (msg) => msg || "Complaint submitted.",
                                                    error: (err) => err?.message || "Failed to submit complaint.",
                                                }
                                            );
                                            resetComplaintModal();
                                        }}
                                        className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                                    >
                                        Submit Complaint
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}

            {returnModal && (
                <tr>
                    <td colSpan={5}>
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                            <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
                                <h3 className="text-lg font-semibold text-slate-800">Request Return</h3>
                                {returnModal.productName && (
                                    <p className="mt-1 text-sm text-slate-500">
                                        Product: <span className="font-medium text-slate-700">{returnModal.productName}</span>
                                    </p>
                                )}
                                <div className="mt-4 space-y-3">
                                    <select
                                        value={returnForm.reason}
                                        onChange={(e) => setReturnForm((prev) => ({ ...prev, reason: e.target.value }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                    >
                                        <option value="">Select return reason</option>
                                        <option value="Damaged">Damaged product</option>
                                        <option value="Wrong Item">Wrong item delivered</option>
                                        <option value="Not as described">Not as described</option>
                                        <option value="Size issue">Size/fit issue</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <textarea
                                        value={returnForm.description}
                                        onChange={(e) => setReturnForm((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Describe the reason for return"
                                        rows={4}
                                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div className="mt-5 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={resetReturnModal}
                                        className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!returnForm.reason) {
                                                toast.error("Please select a return reason.");
                                                return;
                                            }
                                            toast.promise(
                                                onReturn?.({
                                                    orderId: returnModal.orderId,
                                                    productId: returnModal.productId,
                                                    reason: returnForm.reason,
                                                    description: returnForm.description,
                                                }),
                                                {
                                                    loading: "Submitting return request...",
                                                    success: (msg) => msg || "Return request submitted.",
                                                    error: (err) => err?.message || "Failed to submit return request.",
                                                }
                                            );
                                            resetReturnModal();
                                        }}
                                        className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                                    >
                                        Submit Return
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

export default OrderItem;
