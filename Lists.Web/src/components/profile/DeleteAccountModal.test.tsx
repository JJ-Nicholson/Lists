import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "../../api/client";
import { render, screen, waitFor } from "../../test/render";
import { server } from "../../test/server";
import DeleteAccountModal from "./DeleteAccountModal";

const userUrl = buildApiUrl("/user").toString();

describe("DeleteAccountModal", () => {
    it("renders the confirmation text", () => {
        render(
            <DeleteAccountModal
                onAccountDeleted={() => {}}
                onClose={() => {}}
            />,
        );

        expect(screen.getByRole("dialog", { name: "Delete Account" }))
            .toBeInTheDocument();
        expect(screen.getByText("This action cannot be undone."))
            .toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Delete Account" }))
            .toBeInTheDocument();
    });

    it("deletes the account and calls the callback", async () => {
        const authorisationHeaders: (string | null)[] = [];
        const onAccountDeleted = vi.fn();
        server.use(
            http.delete(userUrl, ({ request }) => {
                authorisationHeaders.push(request.headers.get("Authorization"));

                return new HttpResponse(null, { status: 204 });
            }),
        );
        const { user } = render(
            <DeleteAccountModal
                onAccountDeleted={onAccountDeleted}
                onClose={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete Account" }));

        await waitFor(() => {
            expect(onAccountDeleted).toHaveBeenCalledOnce();
        });
        expect(authorisationHeaders).toEqual(["Bearer test-access-token"]);
    });

    it("shows an API error without calling the callback", async () => {
        const onAccountDeleted = vi.fn();
        server.use(
            http.delete(userUrl, () => {
                return HttpResponse.json(
                    { message: "Account deletion could not be completed right now." },
                    { status: 502 },
                );
            }),
        );
        const { user } = render(
            <DeleteAccountModal
                onAccountDeleted={onAccountDeleted}
                onClose={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete Account" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Account deletion could not be completed right now.",
        );
        expect(onAccountDeleted).not.toHaveBeenCalled();
    });

    it("calls the callback when local account deletion is incomplete", async () => {
        const onAccountDeleted = vi.fn();
        server.use(
            http.delete(userUrl, () => {
                return HttpResponse.json(
                    {
                        message: "Account deletion could not be completed right now.",
                        code: "account_deletion_incomplete",
                    },
                    { status: 500 },
                );
            }),
        );
        const { user } = render(
            <DeleteAccountModal
                onAccountDeleted={onAccountDeleted}
                onClose={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete Account" }));

        await waitFor(() => {
            expect(onAccountDeleted).toHaveBeenCalledOnce();
        });
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("disables the actions while submitting", async () => {
        const onAccountDeleted = vi.fn();
        server.use(
            http.delete(userUrl, async () => {
                await delay(100);

                return new HttpResponse(null, { status: 204 });
            }),
        );
        const { user } = render(
            <DeleteAccountModal
                onAccountDeleted={onAccountDeleted}
                onClose={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete Account" }));

        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Deleting..." }))
            .toBeDisabled();
        expect(
            screen.queryByRole("button", { name: "Close dialog" }),
        ).not.toBeInTheDocument();

        await waitFor(() => {
            expect(onAccountDeleted).toHaveBeenCalledOnce();
        });
    });
});
