'use client'
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductSync from "@/components/ProductSync";
import AIAssistantLauncher from "@/components/AIAssistantLauncher";

export default function PublicLayout({ children }) {

    return (
        <>
            <Banner />
            <Navbar />
            <ProductSync />
            {children}
            <AIAssistantLauncher />
            <Footer />
        </>
    );
}
