import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router";
import { Button } from "../Button";

const githubUrl = "https://github.com/JJ-Nicholson/Lists";

export default function HomeHero() {
    const { loginWithRedirect } = useAuth0();

    function login() {
        loginWithRedirect({
            appState: { returnTo: "/lists" },
        });
    }

    function signup() {
        loginWithRedirect({
            appState: { returnTo: "/lists" },
            authorizationParams: { screen_hint: "signup" },
        });
    }

    return (
        <div className="home__cta">
            <div>
                <p className="eyebrow">Plan together</p>
                <h1 className="heading">Lists</h1>
            </div>

            <p className="lede">
                Lists lets you <span className="underline">create</span>,{" "}
                <span className="underline">edit</span>,{" "}
                <span className="underline">search</span>,{" "}
                <span className="underline">sort</span>, and{" "}
                <span className="underline">share</span> all your lists in one
                place. It is free to use, with no ads and no distractions. Plan
                together, keep up with changes, and stay organised down to the
                last detail. See exactly how Lists will look on this device
                below, read the{" "}
                <Link className="highlight" to="/privacy">
                    privacy policy
                </Link>, visit{" "}
                <a
                    className="highlight"
                    href={githubUrl}
                    rel="noreferrer"
                    target="_blank"
                >
                    Lists' GitHub
                </a>, or get started right away!
            </p>

            <div className="home__cta-actions">
                <Button onClick={login} size="large">
                    Login
                </Button>

                <Button onClick={signup} size="large">
                    Get Started
                </Button>
            </div>
        </div>
    );
}
