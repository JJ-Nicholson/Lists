import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "../../api/client";
import type { ListItem } from "../../api/lists";
import { render, screen, waitFor } from "../../test/render";
import { server } from "../../test/server";
import DeleteItemModal from "./DeleteItemModal";

const LIST_ID = "1";

function createItem(overrides: Partial<ListItem> = {}): ListItem {
    return {
        id: 1,
        name: "Milk",
        amount: 5,
        isCompleted: false,
        version: 7,
        ...overrides,
    };
}

function deleteUrl(item: ListItem): string {
    return buildApiUrl(`/lists/${LIST_ID}/items/${item.id}`).toString();
}

function mockDeleteConflict(item: ListItem): void {
    server.use(
        http.delete(deleteUrl(item), () => {
            return HttpResponse.json(
                { message: "Item was modified. Reload and try again." },
                { status: 409 },
            );
        }),
    );
}

describe("DeleteItemModal", () => {
    it("renders the confirmation text", () => {
        render(
            <DeleteItemModal
                item={createItem()}
                listId={LIST_ID}
                onClose={() => {}}
                onItemDeleted={() => {}}
                onListNotFound={() => {}}
                onReloadItem={() => {}}
            />,
        );

        expect(
            screen.getByRole("dialog", { name: "Delete Entry" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Milk")).toBeInTheDocument();
        expect(screen.getByText("This action cannot be undone."))
            .toBeInTheDocument();
    });

    it("submits the item version and calls callbacks on success", async () => {
        const item = createItem();
        const requests: URL[] = [];
        const onClose = vi.fn();
        const onItemDeleted = vi.fn();
        server.use(
            http.delete(deleteUrl(item), ({ request }) => {
                requests.push(new URL(request.url));
                return new HttpResponse(null, { status: 204 });
            }),
        );
        const { user } = render(
            <DeleteItemModal
                item={item}
                listId={LIST_ID}
                onClose={onClose}
                onItemDeleted={onItemDeleted}
                onListNotFound={() => {}}
                onReloadItem={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledOnce();
        });
        expect(onItemDeleted).toHaveBeenCalledOnce();
        expect(requests).toHaveLength(1);
        expect(requests[0].searchParams.get("version")).toBe(
            String(item.version),
        );
    });

    it("shows an API error", async () => {
        const item = createItem();
        server.use(
            http.delete(deleteUrl(item), () => {
                return HttpResponse.json(
                    { message: "Could not delete Milk." },
                    { status: 403 },
                );
            }),
        );
        const { user } = render(
            <DeleteItemModal
                item={item}
                listId={LIST_ID}
                onClose={() => {}}
                onItemDeleted={() => {}}
                onListNotFound={() => {}}
                onReloadItem={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not delete Milk.",
        );
    });

    it("offers to reload after a concurrency error", async () => {
        const item = createItem();
        const onReloadItem = vi.fn(async () => undefined);
        mockDeleteConflict(item);
        const { user } = render(
            <DeleteItemModal
                item={item}
                listId={LIST_ID}
                onClose={() => {}}
                onItemDeleted={() => {}}
                onListNotFound={() => {}}
                onReloadItem={onReloadItem}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "This entry has been modified since you last checked.",
        );
        expect(
            screen.queryByRole("button", { name: "Delete" }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Reload List" }));

        expect(onReloadItem).toHaveBeenCalledWith(item);
    });

    it("keeps reload available when reloading fails", async () => {
        const item = createItem();
        mockDeleteConflict(item);
        const { user } = render(
            <DeleteItemModal
                item={item}
                listId={LIST_ID}
                onClose={() => {}}
                onItemDeleted={() => {}}
                onListNotFound={() => {}}
                onReloadItem={() => Promise.reject(new Error("Nope"))}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));
        await user.click(
            await screen.findByRole("button", { name: "Reload List" }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not reload list entry.",
        );
        expect(
            screen.getByRole("button", { name: "Reload List" }),
        ).toBeInTheDocument();
    });

    it("reports when the list is unavailable", async () => {
        const item = createItem();
        const onListNotFound = vi.fn();
        server.use(
            http.delete(deleteUrl(item), () => {
                return HttpResponse.json(
                    { message: "List not found." },
                    { status: 404 },
                );
            }),
        );
        const { user } = render(
            <DeleteItemModal
                item={item}
                listId={LIST_ID}
                onClose={() => {}}
                onItemDeleted={() => {}}
                onListNotFound={onListNotFound}
                onReloadItem={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(onListNotFound).toHaveBeenCalledOnce();
        });
    });
});
