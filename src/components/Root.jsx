// Root.js
import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Outlet } from "react-router-dom";

export default function Root() {
    return (
        <div className="grid min-h-screen bg-page grid-cols-[18%_82%] grid-rows-[1fr_auto] [grid-template-areas:'header_main'_'footer_footer'] max-nav:grid-cols-[100%] max-nav:[grid-template-areas:'main'_'footer']">
            <Header />
            <main className="[grid-area:main] bg-page">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}
