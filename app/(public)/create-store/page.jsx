'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState } from "react"
import Image from "next/image"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"

export default function CreateStore() {
    const router = useRouter()
    const { isLoaded, isSignedIn, user } = useUser()

    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState("")

    const [storeInfo, setStoreInfo] = useState({
        storename: "",
        fullname: "",
        description: "",
        email: "",
        contact: "",
        address: "",
        image: ""
    })

    const onChangeHandler = (e) => {
        setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value })
    }

    const getStatusMessage = (storeStatus) => {
        if (storeStatus === "approved") {
            return "Your store is approved. You can now access the seller dashboard."
        }
        if (storeStatus === "rejected") {
            return "Your store request was rejected by admin. Please update details and re-apply."
        }
        return "Your store request is pending admin approval."
    }

    const fetchSellerStatus = async () => {
        if (!user?.id) {
            setLoading(false)
            return
        }
        const response = await fetch(`/api/store-requests?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" })
        const payload = await response.json()

        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to load store request status.")
        }

        const existingStore = payload?.data?.[0]

        if (existingStore) {
            // Keep pending message only right after submit.
            // On reload/open, show fresh form again for pending requests.
            if (existingStore.status === "pending") {
                setAlreadySubmitted(false)
                setStatus("")
                setMessage("")
                setLoading(false)
                return
            }
            setAlreadySubmitted(true)
            setStatus(existingStore.status)
            setMessage(getStatusMessage(existingStore.status))
        }

        setLoading(false)
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        const safeTrim = (value) => (typeof value === "string" ? value.trim() : "")
        const trimmedStore = {
            storename: safeTrim(storeInfo.storename),
            fullname: safeTrim(storeInfo.fullname),
            description: safeTrim(storeInfo.description),
            email: safeTrim(storeInfo.email),
            contact: safeTrim(storeInfo.contact),
            address: safeTrim(storeInfo.address),
        }

        if (!trimmedStore.storename || !trimmedStore.fullname || !trimmedStore.description || !trimmedStore.email || !trimmedStore.contact || !trimmedStore.address) {
            throw new Error("Please fill all store details.")
        }

        const response = await fetch("/api/store-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: user.id,
                fullName: trimmedStore.fullname,
                storeName: trimmedStore.storename,
                description: trimmedStore.description,
                email: trimmedStore.email,
                contact: trimmedStore.contact,
                address: trimmedStore.address,
                logo: assets.happy_store,
            }),
        })

        const payload = await response.json()
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.message || "Failed to submit store request.")
        }

        const savedStore = payload?.data || {
            userId: user.id,
            name: trimmedStore.storename,
            description: trimmedStore.description,
            address: trimmedStore.address,
            status: "pending",
            isActive: false,
        }

        setAlreadySubmitted(true)
        setStatus(savedStore.status || "pending")
        setMessage(getStatusMessage(savedStore.status || "pending"))
        return payload?.message || "Store request submitted."
    }

    useEffect(() => {
        if (!isLoaded) return
        if (!isSignedIn || !user?.id) {
            toast.error("Please login as user to create a store.")
            window.dispatchEvent(new Event("tsm_open_login"))
            router.push("/")
            setLoading(false)
            return
        }
    }, [isLoaded, isSignedIn, router, user])

    useEffect(() => {
        if (!isLoaded || !isSignedIn || !user?.id) return
        fetchSellerStatus().catch((error) => {
            toast.error(error?.message || "Failed to load seller status.")
            setLoading(false)
        })
    }, [isLoaded, isSignedIn, user])

    useEffect(() => {
        if (status === "approved") {
            const timer = setTimeout(() => {
                router.push("/store")
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [status, router])

    return !loading ? (
        <>
            {!alreadySubmitted ? (
                <div className="mx-6 min-h-[70vh] my-16">
                    <form
                        onSubmit={(e) =>
                            toast.promise(onSubmitHandler(e), {
                                loading: "Submitting data...",
                                success: (msg) => msg || "Store request submitted.",
                                error: (err) => err?.message || "Something went wrong.",
                            })
                        }
                        className="max-w-7xl mx-auto flex flex-col items-start gap-3 text-slate-500"
                    >
                        {/* Title */}
                        <div>
                            <h1 className="text-3xl ">Add Your <span className="text-slate-800 font-medium">Store</span></h1>
                            <p className="max-w-lg">To become a seller on ThriftStore, submit your store details for review. Your store will be activated after admin verification.</p>
                        </div>

                        <label className="mt-10 cursor-pointer">
                            Store Logo
                            <Image src={storeInfo.image ? URL.createObjectURL(storeInfo.image) : assets.upload_area} className="rounded-lg mt-2 h-16 w-auto" alt="Store logo preview" width={150} height={100} />
                            <input type="file" accept="image/*" onChange={(e) => setStoreInfo({ ...storeInfo, image: e.target.files[0] })} hidden />
                        </label>

                        <p>Full Name</p>
                        <input name="fullname" onChange={onChangeHandler} value={storeInfo.fullname} type="text" placeholder="Enter your full name" className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded" required />

                        <p>Store Name</p>
                        <input name="storename" onChange={onChangeHandler} value={storeInfo.storename} type="text" placeholder="Enter your store name" className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded" required />

                        <p>Description</p>
                        <textarea name="description" onChange={onChangeHandler} value={storeInfo.description} rows={5} placeholder="Enter your store description" className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none" required />

                        <p>Email</p>
                        <input name="email" onChange={onChangeHandler} value={storeInfo.email} type="email" placeholder="Enter your store email" className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded" required />

                        <p>Contact Number</p>
                        <input name="contact" onChange={onChangeHandler} value={storeInfo.contact} type="text" placeholder="Enter your store contact number" className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded" required />

                        <p>Address</p>
                        <textarea name="address" onChange={onChangeHandler} value={storeInfo.address} rows={5} placeholder="Enter your store address" className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none" required />

                        <button className="bg-slate-800 text-white px-12 py-2 rounded mt-10 mb-40 active:scale-95 hover:bg-slate-900 transition ">Submit</button>
                    </form>
                </div>
            ) : (
                <div className="min-h-[80vh] flex flex-col items-center justify-center">
                    <p className="sm:text-2xl lg:text-3xl mx-5 font-semibold text-slate-500 text-center max-w-2xl">{message}</p>
                    {status === "approved" && <p className="mt-5 text-slate-400">redirecting to dashboard in <span className="font-semibold">5 seconds</span></p>}
                </div>
            )}
        </>
    ) : (<Loading />)
}
