import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router";

export default function HomePage() {
    const { isAuthenticated, isLoading } = useAuth0();

    if (isLoading) {
        return <p>Loading...</p>;
    }

    if (isAuthenticated) {
        return <Navigate replace to="/lists" />;
    }

    return (
        <section>
            <h1>Lists</h1>
        </section>
    );
}
