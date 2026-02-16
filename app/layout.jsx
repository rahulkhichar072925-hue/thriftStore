import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import { ClerkProvider } from "@clerk/nextjs";
import CartPersistence from "@/components/CartPersistence";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
    title: "Thrift Store. - Shop smarter",
    description: "Thrift Store. - Shop smarter",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${outfit.className} antialiased`}>
                <ClerkProvider
                    appearance={{
                        variables: {
                            colorPrimary: "#0f766e",
                            colorText: "#0f172a",
                            colorBackground: "#ffffff",
                            borderRadius: "0.75rem",
                        },
                        elements: {
                            card: "shadow-xl border border-slate-200",
                            headerTitle: "text-slate-800",
                            headerSubtitle: "text-slate-500",
                            socialButtonsBlockButton: "border border-slate-300 hover:bg-slate-50",
                            formButtonPrimary: "bg-teal-700 hover:bg-teal-800 text-white",
                            formFieldInput: "border border-slate-300 focus:border-teal-700 focus:ring-teal-700",
                            footerActionLink: "text-teal-700 hover:text-teal-800",
                        },
                        layout: {
                            logoImageUrl: "/brand/thriftstore-logo.svg",
                            socialButtonsPlacement: "bottom",
                        },
                    }}
                >
                    <StoreProvider>
                        <CartPersistence />
                        <Toaster />
                        {children}
                    </StoreProvider>
                </ClerkProvider>
            </body>
        </html>
    );
}
