import { useAuth0 } from "@auth0/auth0-react";
import type { MouseEvent } from "react";
import { Link } from "react-router";

export default function AuthCallbackPage() {
    const { error, isLoading, loginWithRedirect } = useAuth0();

    function retryLogin(event: MouseEvent<HTMLAnchorElement>): void {
        event.preventDefault();

        loginWithRedirect({
            appState: {
                returnTo: "/lists",
            },
        });
    }

    if (error) {
        return (
            <article className="content-page">
                <header>
                    <h1 className="heading heading--small">
                        Failed to authenticate
                    </h1>
                    <p className="lede" role="alert">
                        Your sign in or sign up was cancelled or could not be
                        completed.
                    </p>
                </header>

                <section className="content-page__section">
                    <p>
                        Return to{" "}
                        <Link className="highlight" to="/">
                            Lists
                        </Link>{" "}
                        or{" "}
                        <Link
                            className="highlight"
                            onClick={retryLogin}
                            to="/lists"
                        >
                            try again
                        </Link>
                        .
                    </p>
                </section>
            </article>
        );
    }

    return <p>{isLoading ? "Loading..." : "Redirecting..."}</p>;
}
