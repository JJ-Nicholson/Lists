import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "../../api/client";
import type { User } from "../../api/users";
import { fireEvent, render, screen, waitFor } from "../../test/render";
import { server } from "../../test/server";
import SetUsernameModal from "./SetUsernameModal";

const userUrl = buildApiUrl("/user").toString();

describe("SetUsernameModal", () => {
    it.each([
        {
            currentUsername: "josh",
            title: "Change Username",
            value: "josh",
        },
        {
            currentUsername: null,
            title: "Set Username",
            value: "",
        },
    ])("renders the $title mode", ({ currentUsername, title, value }) => {
        render(
            <SetUsernameModal
                currentUsername={currentUsername}
                onClose={() => {}}
                onUserUpdated={() => {}}
            />,
        );

        expect(screen.getByRole("dialog", { name: title })).toBeInTheDocument();
        expect(screen.getByLabelText("Username")).toHaveValue(value);
    });

    it("validates a blank username", () => {
        render(
            <SetUsernameModal
                currentUsername={null}
                onClose={() => {}}
                onUserUpdated={() => {}}
            />,
        );
        fireEvent.change(screen.getByLabelText("Username"), {
            target: { value: "   " },
        });

        fireEvent.submit(document.getElementById("set-username-form")!);

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Enter a username.",
        );
    });

    it("submits a trimmed username and returns the normalised user", async () => {
        const bodies: unknown[] = [];
        const authorisationHeaders: (string | null)[] = [];
        const onUserUpdated = vi.fn();
        const updatedUser: User = {
            username: "josh_user",
            needsUsername: false,
        };
        server.use(
            http.patch(userUrl, async ({ request }) => {
                bodies.push(await request.json());
                authorisationHeaders.push(request.headers.get("Authorization"));

                return HttpResponse.json(updatedUser);
            }),
        );
        const { user } = render(
            <SetUsernameModal
                currentUsername={null}
                onClose={() => {}}
                onUserUpdated={onUserUpdated}
            />,
        );

        await user.type(screen.getByLabelText("Username"), "  Josh_User  ");
        fireEvent.submit(document.getElementById("set-username-form")!);

        await waitFor(() => {
            expect(onUserUpdated).toHaveBeenCalledWith(updatedUser);
        });
        expect(bodies).toEqual([{ username: "Josh_User" }]);
        expect(authorisationHeaders).toEqual(["Bearer test-access-token"]);
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
        const { user } = render(
            <SetUsernameModal
                currentUsername={null}
                onClose={() => {}}
                onUserUpdated={() => {}}
            />,
        );

        await user.type(screen.getByLabelText("Username"), "josh");
        await user.click(screen.getByRole("button", { name: "Save" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Username is already taken.",
        );
    });

    it("disables the form while submitting", async () => {
        const onUserUpdated = vi.fn();
        server.use(
            http.patch(userUrl, async () => {
                await delay(100);

                return HttpResponse.json({
                    username: "josh",
                    needsUsername: false,
                });
            }),
        );
        const { user } = render(
            <SetUsernameModal
                currentUsername="josh"
                onClose={() => {}}
                onUserUpdated={onUserUpdated}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Save" }));

        expect(screen.getByLabelText("Username")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Saving..." }))
            .toBeDisabled();
        expect(
            screen.queryByRole("button", { name: "Close dialog" }),
        ).not.toBeInTheDocument();

        await waitFor(() => {
            expect(onUserUpdated).toHaveBeenCalledOnce();
        });
    });
});
