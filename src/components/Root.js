import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Outlet } from "react-router-dom";
import "../componentStyle/Root.css";
export default function Root() {
    return (
        <div className={'rootComponent'}>
            <Header id={"header"}/>
            <main id={"main"}>
                <Outlet/>
            </main>
            <Footer id={"footer"}/>
        </div>
    )
}