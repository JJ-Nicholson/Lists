import { Link } from "react-router";

export default function ListsPage() {
    return (
        <section>
            <h1>Lists</h1>
            <p>Your lists will appear here.</p>
            <Link to="/lists/1">Open list 1</Link>
        </section>
    );
}
