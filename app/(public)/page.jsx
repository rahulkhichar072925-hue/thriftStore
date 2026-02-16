'use client'
import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import HomeCoupons from "@/components/HomeCoupons";
import Newsletter from "@/components/Newsletter";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";

export default function Home() {
    return (
        <div>
            <Hero />
            <HomeCoupons />
            <LatestProducts />
            <BestSelling />
            <OurSpecs />
            <Newsletter />
        </div>
    );
}
