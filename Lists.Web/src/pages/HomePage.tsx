import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router";
import HomeHero from "../components/home/HomeHero";
import HomePreviewGrid from "../components/home/HomePreviewGrid";

export default function HomePage() {
    const { isAuthenticated, isLoading } = useAuth0();

    if (isLoading) {
        return <p>Loading...</p>;
    }

    if (isAuthenticated) {
        return <Navigate replace to="/lists" />;
    }

    return (
        <>
            <HomeHero />
            <HomePreviewGrid />
        </>
    );
}
