import { delay, http, HttpResponse } from "msw";
import { Route, Routes, useLocation, type InitialEntry } from "react-router";
import { describe, expect, it } from "vitest";

import { buildApiUrl } from "../api/client";
import type { User } from "../api/users";
import { fireEvent, render, screen, waitFor } from "../test/render";
import { server } from "../test/server";
import SetupProfilePage from "./SetupProfilePage";

const userUrl = buildApiUrl("/user").toString();

function LocationDisplay() {
    const location = useLocation();

    return <p>{`${location.pathname}${location.search}${location.hash}`}</p>;
}

function renderSetupProfile(route: InitialEntry = "/setup-profile") {
    return render(
        <Routes>
            <Route path="/setup-profile" element={<SetupProfilePage />} />
            <Route path="/lists" element={<LocationDisplay />} />
            <Route path="/lists/:listId" element={<LocationDisplay />} />
        </Routes>,
        { route },
    );
}

function mockUpdateUser(
    onRequest: (request: Request) => Promise<void> | void = () => {},
    response: User = {
        username: "josh",
        needsUsername: false,
    },
): void {
    server.use(
        http.patch(userUrl, async ({ request }) => {
            await onRequest(request);

            return HttpResponse.json(response);
        }),
    );
}

describe("SetupProfilePage", () => {
    it("validates a blank username", async () => {
        const { user } = renderSetupProfile();

        const usernameInput = screen.getByLabelText("Username");
        const form = usernameInput.closest("form");

        if (!form) {
            throw new Error("Expected username form.");
        }

        await user.type(usernameInput, "   ");
        fireEvent.submit(form);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Enter a username.",
        );
    });

    it("submits a trimmed username and navigates to the saved return path", async () => {
        const bodies: unknown[] = [];
        const authorisationHeaders: (string | null)[] = [];
        mockUpdateUser(async (request) => {
            bodies.push(await request.json());
            authorisationHeaders.push(request.headers.get("Authorization"));
        });
        const { user } = renderSetupProfile({
            pathname: "/setup-profile",
            state: {
                returnTo: {
                    pathname: "/lists/42",
                    search: "?search=milk",
                    hash: "#hash",
                },
            },
        });

        await user.type(screen.getByLabelText("Username"), "  josh  ");
        await user.click(screen.getByRole("button", { name: "Continue" }));

        expect(await screen.findByText("/lists/42?search=milk#hash"))
            .toBeInTheDocument();
        expect(bodies).toEqual([{ username: "josh" }]);
        expect(authorisationHeaders).toEqual(["Bearer test-access-token"]);
    });

    it("navigates to lists when there is no saved return path", async () => {
        mockUpdateUser();
        const { user } = renderSetupProfile();

        await user.type(screen.getByLabelText("Username"), "josh");
        await user.click(screen.getByRole("button", { name: "Continue" }));

        expect(await screen.findByText("/lists")).toBeInTheDocument();
    });

    it("navigates to lists when the saved return path is setup profile", async () => {
        mockUpdateUser();
        const { user } = renderSetupProfile({
            pathname: "/setup-profile",
            state: {
                returnTo: {
                    pathname: "/setup-profile",
                },
            },
        });

        await user.type(screen.getByLabelText("Username"), "josh");
        await user.click(screen.getByRole("button", { name: "Continue" }));

        expect(await screen.findByText("/lists")).toBeInTheDocument();
    });

    it("shows an API error", async () => {
        server.use(
            http.patch(userUrl, () => {
                return HttpResponse.json(
                    { message: "Username is already taken." },
                    { status: 409 },
                );
            }),
        );
        const { user } = renderSetupProfile();

        await user.type(screen.getByLabelText("Username"), "josh");
        await user.click(screen.getByRole("button", { name: "Continue" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Username is already taken.",
        );
    });

    it("disables the form while submitting", async () => {
        mockUpdateUser(async () => {
            await delay(100);
        });
        const { user } = renderSetupProfile();

        await user.type(screen.getByLabelText("Username"), "josh");
        await user.click(screen.getByRole("button", { name: "Continue" }));

        expect(screen.getByLabelText("Username")).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Saving..." }),
        ).toBeDisabled();

        await waitFor(() => {
            expect(screen.getByText("/lists")).toBeInTheDocument();
        });
    });
});
