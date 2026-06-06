export default function PrivacyPage() {
    return (
        <article className="content-page">
            <header>
                <h1 className="heading heading--small">Privacy</h1>
                <p className="lede">
                    Lists stores the data needed to run shared lists, keep
                    accounts separate, and protect access to your lists.
                </p>
            </header>

            <section className="content-page__section">
                <h2>What We Store</h2>
                <p>
                    Lists stores your username, an internal account identifier,
                    list names, item names, item prices, item completion state,
                    and list access roles. It also stores internal record
                    versions so the app can detect when a list or item has
                    changed before saving updates.
                </p>
                <p>
                    Lists uses Auth0 for authentication and authorisation,
                    Render for hosting the backend API and database, Vercel
                    for hosting the frontend, and GitHub for source control
                    and deployment workflows. These providers may store technical
                    information needed to operate, secure, deploy, and troubleshoot
                    the app.
                </p>
            </section>

            <section className="content-page__section">
                <h2>How We Use It</h2>
                <p>
                    The data we store is used to show your lists, save changes, authenticate users,
                    authorise access, and let list owners share access with other users.
                    It is not used for advertising or sold to third parties.
                </p>
            </section>

            <section className="content-page__section">
                <h2>Sharing Data</h2>
                <p>
                    Lists is designed for sharing. When you create a list, you become the
                    owner of that list. As an owner, you can rename the list, view, add,
                    remove, and modify items in the list, as well as share access to the
                    list with other users. When you share a list with another user, that user
                    becomes an editor of the list. Editors can add, remove, and modify items
                    in the list, but cannot rename the list or share access with other users.
                    Users with access to a list can see the list name, items, prices,
                    completion state, who else has access, and what role each user has.
                </p>
            </section>

            <section className="content-page__section">
                <h2>Deleting Data</h2>
                <p>
                    Deleting a list removes that list, its items, and its access records
                    (records of who has access to the list and what role they have).
                    Deleting an item from a list removes that item. Deleting your account
                    removes your Lists account record, username, list access records,
                    lists you own, the items in those lists, and your Auth0 Lists account.
                </p>
            </section>
        </article>
    );
}
