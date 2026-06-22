import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "../api/client";
import type { User } from "../api/users";
import { render, screen } from "../test/render";
import { server } from "../test/server";
import ProfilePage from "./ProfilePage";

const userUrl = buildApiUrl("/user").toString();

function mockCurrentUser(
    user: User,
    onRequest: (request: Request) => Promise<void> | void = () => {},
): void {
    server.use(
        http.get(userUrl, async ({ request }) => {
            await onRequest(request);

            return HttpResponse.json(user);
        }),
    );
}

describe("ProfilePage", () => {
    it("loads and displays the current username", async () => {
        const authorisationHeaders: (string | null)[] = [];
        mockCurrentUser(
            {
                username: "josh",
                needsUsername: false,
            },
            (request) => {
                authorisationHeaders.push(request.headers.get("Authorization"));
            },
        );

        render(<ProfilePage />);

        expect(
            await screen.findByRole("heading", { level: 1, name: "josh" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Change Username" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Logout" }))
            .toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Delete Account" }))
            .toBeInTheDocument();
        expect(authorisationHeaders).toEqual(["Bearer test-access-token"]);
    });

    it("offers to set a missing username", async () => {
        mockCurrentUser({
            username: null,
            needsUsername: true,
        });

        render(<ProfilePage />);

        expect(
            await screen.findByRole("button", { name: "Set Username" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", {
                level: 1,
                name: "Your Profile",
            }),
        ).toBeInTheDocument();
    });

    it("keeps logout available when the profile cannot be loaded", async () => {
        const logout = vi.fn(async () => undefined);
        server.use(
            http.get(userUrl, () => {
                return HttpResponse.text("Nope", { status: 500 });
            }),
        );
        const { user } = render(<ProfilePage />, {
            auth0: { logout },
        });

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not load your profile. Refresh the page and try again.",
        );

        await user.click(screen.getByRole("button", { name: "Logout" }));

        expect(logout).toHaveBeenCalledWith({
            logoutParams: { returnTo: window.location.origin },
        });
    });

    it("opens the profile dialogs", async () => {
        mockCurrentUser({
            username: "josh",
            needsUsername: false,
        });
        const { user } = render(<ProfilePage />);

        await user.click(
            await screen.findByRole("button", { name: "Change Username" }),
        );
        expect(
            screen.getByRole("dialog", { name: "Change Username" }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Cancel" }));
        await user.click(screen.getByRole("button", { name: "Delete Account" }));

        expect(
            screen.getByRole("dialog", { name: "Delete Account" }),
        ).toBeInTheDocument();
    });

    it("shows the normalised username after an update", async () => {
        mockCurrentUser({
            username: "josh",
            needsUsername: false,
        });
        server.use(
            http.patch(userUrl, () => {
                return HttpResponse.json({
                    username: "alex_user",
                    needsUsername: false,
                });
            }),
        );
        const { user } = render(<ProfilePage />);

        await user.click(
            await screen.findByRole("button", { name: "Change Username" }),
        );
        const usernameInput = screen.getByLabelText("Username");
        await user.clear(usernameInput);
        await user.type(usernameInput, "Alex_User");
        await user.click(screen.getByRole("button", { name: "Save" }));

        expect(
            await screen.findByRole("heading", {
                level: 1,
                name: "alex_user",
            }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("dialog", { name: "Change Username" }),
        ).not.toBeInTheDocument();
    });
});
