import { Link } from "react-router";

export default function NotFoundPage() {
    return (
        <article className="content-page">
            <header>
                <p className="heading">404</p>
                <h1 className="heading heading--small">Page Not Found</h1>
                <p className="lede">
                    That page does not exist, or it may have moved.
                </p>
            </header>

            <section className="content-page__section">
                <p>
                    Head to our{" "}
                    <Link className="highlight" to="/">
                        home page
                    </Link>{" "}
                    to continue your search.
                </p>
            </section>
        </article>
    );
}
