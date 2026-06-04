import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";

import { scrollToPageTop } from "../navigation/scroll";
import Footer from "./Footer";
import Header from "./Header";

function getPageVariant(pathname: string) {
    if (pathname === "/") return "home";
    if (pathname === "/lists") return "lists";
    if (pathname.startsWith("/lists/")) return "list";

    return "default";
}

export default function AppLayout() {
    const { pathname } = useLocation();
    const variant = getPageVariant(pathname);

    useEffect(() => {
        scrollToPageTop();
    }, [pathname]);

    return (
        <>
            <Header />

            <main className={`page page--${variant}`}>
                <section className={`page__container page__container--${variant}`}>
                    <Outlet />
                </section>
            </main>

            <Footer />
        </>
    );
}
