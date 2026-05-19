const githubUrl = "https://github.com/JJ-Nicholson/Lists";

export default function Footer() {
    return (
        <footer className="site-footer">
            <p>Plan Together</p>

            <nav className="site-footer__nav" aria-label="Footer">
                <a
                    className="site-footer__icon-link"
                    href={githubUrl}
                    target="_blank"
                    rel="noreferrer"
                >
                    <svg aria-hidden="true" className="site-footer__icon">
                        <use href="/icons.svg#github-icon" />
                    </svg>
                    <span>GitHub</span>
                </a>
            </nav>
        </footer>
    );
}
