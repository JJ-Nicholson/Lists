import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "../../api/client";
import type { ListSummary } from "../../api/lists";
import { render, screen, waitFor } from "../../test/render";
import { server } from "../../test/server";
import DeleteListModal from "./DeleteListModal";

function createList(overrides: Partial<ListSummary> = {}): ListSummary {
    return {
        id: 1,
        name: "Groceries",
        unitLabel: "items",
        version: 7,
        itemCount: 5,
        completedItemCount: 2,
        currentUserRole: "owner",
        ownerUsername: "josh",
        ...overrides,
    };
}

describe("DeleteListModal", () => {
    it("renders the confirmation text", () => {
        render(
            <DeleteListModal
                list={createList()}
                onClose={() => {}}
                onListDeleted={() => {}}
            />,
        );

        expect(screen.getByRole("dialog", { name: "Delete List" }))
            .toBeInTheDocument();
        expect(screen.getByText("Groceries")).toBeInTheDocument();
        expect(screen.getByText("This action cannot be undone."))
            .toBeInTheDocument();
    });

    it("submits the list version and calls callbacks on success", async () => {
        const list = createList();
        const requests: URL[] = [];
        const onClose = vi.fn();
        const onListDeleted = vi.fn();
        server.use(
            http.delete(buildApiUrl(`/lists/${list.id}`).toString(), ({ request }) => {
                requests.push(new URL(request.url));

                return new HttpResponse(null, { status: 204 });
            }),
        );
        const { user } = render(
            <DeleteListModal
                list={list}
                onClose={onClose}
                onListDeleted={onListDeleted}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledOnce();
        });
        expect(onListDeleted).toHaveBeenCalledOnce();
        expect(requests).toHaveLength(1);
        expect(requests[0].searchParams.get("version")).toBe(String(list.version));
    });

    it("shows an API error", async () => {
        const list = createList();
        server.use(
            http.delete(buildApiUrl(`/lists/${list.id}`).toString(), () => {
                return HttpResponse.json(
                    { message: "Only list owners can delete lists." },
                    { status: 403 },
                );
            }),
        );
        const { user } = render(
            <DeleteListModal
                list={list}
                onClose={() => {}}
                onListDeleted={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Only list owners can delete lists.",
        );
    });
});
