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

function mockDeleteConflict(list: ListSummary): void {
    server.use(
        http.delete(buildApiUrl(`/lists/${list.id}`).toString(), () => {
            return HttpResponse.json(
                { message: "List was modified. Reload and try again." },
                { status: 409 },
            );
        }),
    );
}

describe("DeleteListModal", () => {
    it("renders the confirmation text", () => {
        render(
            <DeleteListModal
                list={createList()}
                onClose={() => {}}
                onListDeleted={() => {}}
                onReloadList={() => {}}
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
                onReloadList={() => {}}
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
                onReloadList={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Only list owners can delete lists.",
        );
    });

    it("offers to reload after a concurrency error", async () => {
        const list = createList();
        const onReloadList = vi.fn(async () => undefined);
        mockDeleteConflict(list);
        const { user } = render(
            <DeleteListModal
                list={list}
                onClose={() => {}}
                onListDeleted={() => {}}
                onReloadList={onReloadList}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "This list has been modified since you last checked.",
        );
        expect(
            screen.queryByRole("button", { name: "Delete" }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Reload Lists" }));

        expect(onReloadList).toHaveBeenCalledWith(list);
    });

    it("keeps reload available when reloading fails", async () => {
        const list = createList();
        mockDeleteConflict(list);
        const { user } = render(
            <DeleteListModal
                list={list}
                onClose={() => {}}
                onListDeleted={() => {}}
                onReloadList={() => Promise.reject(new Error("Nope"))}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));
        await user.click(
            await screen.findByRole("button", { name: "Reload Lists" }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not reload list.",
        );
        expect(
            screen.getByRole("button", { name: "Reload Lists" }),
        ).toBeInTheDocument();
    });

    it("treats a missing list as already deleted", async () => {
        const list = createList();
        const onClose = vi.fn();
        const onListDeleted = vi.fn();
        server.use(
            http.delete(buildApiUrl(`/lists/${list.id}`).toString(), () => {
                return HttpResponse.json(
                    { message: "List not found." },
                    { status: 404 },
                );
            }),
        );
        const { user } = render(
            <DeleteListModal
                list={list}
                onClose={onClose}
                onListDeleted={onListDeleted}
                onReloadList={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledOnce();
        });
        expect(onListDeleted).toHaveBeenCalledOnce();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
