import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "../../api/client";
import type { ListItem } from "../../api/lists";
import { fireEvent, render, screen, waitFor } from "../../test/render";
import { server } from "../../test/server";
import EditItemModal from "./EditItemModal";

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

function updateUrl(item: ListItem): string {
    return buildApiUrl(`/lists/${LIST_ID}/items/${item.id}`).toString();
}

function mockUpdateConflict(item: ListItem): void {
    server.use(
        http.patch(updateUrl(item), () => {
            return HttpResponse.json(
                { message: "Item was modified. Reload and try again." },
                { status: 409 },
            );
        }),
    );
}

describe("EditItemModal", () => {
    it.each([
        {
            name: "   ",
            amount: "5",
            message: "Enter an entry name.",
        },
        {
            name: "Milk",
            amount: "",
            message: "Enter a valid amount.",
        },
    ])("validates entry values", ({ name, amount, message }) => {
        render(
            <EditItemModal
                item={createItem()}
                listId={LIST_ID}
                onClose={() => {}}
                onItemUpdated={() => {}}
                onListNotFound={() => {}}
                onReloadItem={() => {}}
                unitLabel="items"
            />,
        );
        fireEvent.change(screen.getByLabelText("Entry name"), {
            target: { value: name },
        });
        fireEvent.change(screen.getByLabelText("Amount (items)"), {
            target: { value: amount },
        });

        fireEvent.submit(document.getElementById("edit-item-form")!);

        expect(screen.getByRole("alert")).toHaveTextContent(message);
    });

    it("submits item values and calls callbacks on success", async () => {
        const item = createItem();
        const bodies: unknown[] = [];
        const onClose = vi.fn();
        const onItemUpdated = vi.fn();
        server.use(
            http.patch(updateUrl(item), async ({ request }) => {
                bodies.push(await request.json());
                return HttpResponse.json({
                    ...item,
                    name: "Oat Milk",
                    amount: 6,
                    isCompleted: true,
                    version: 8,
                });
            }),
        );
        const { user } = render(
            <EditItemModal
                item={item}
                listId={LIST_ID}
                onClose={onClose}
                onItemUpdated={onItemUpdated}
                onListNotFound={() => {}}
                onReloadItem={() => {}}
                unitLabel="items"
            />,
        );

        await user.clear(screen.getByLabelText("Entry name"));
        await user.type(screen.getByLabelText("Entry name"), " Oat Milk ");
        await user.clear(screen.getByLabelText("Amount (items)"));
        await user.type(screen.getByLabelText("Amount (items)"), "6");
        await user.click(screen.getByLabelText("Completed"));
        await user.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledOnce();
        });
        expect(onItemUpdated).toHaveBeenCalledOnce();
        expect(bodies).toEqual([
            {
                name: "Oat Milk",
                amount: 6,
                isCompleted: true,
                version: 7,
            },
        ]);
    });

    it("offers to reload after a concurrency error", async () => {
        const item = createItem();
        const onReloadItem = vi.fn(async () => undefined);
        mockUpdateConflict(item);
        const { user } = render(
            <EditItemModal
                item={item}
                listId={LIST_ID}
                onClose={() => {}}
                onItemUpdated={() => {}}
                onListNotFound={() => {}}
                onReloadItem={onReloadItem}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "This entry has been modified since you last checked.",
        );
        expect(
            screen.queryByRole("button", { name: "Save" }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Reload List" }));

        expect(onReloadItem).toHaveBeenCalledWith(item);
    });

    it("keeps reload available when reloading fails", async () => {
        const item = createItem();
        mockUpdateConflict(item);
        const { user } = render(
            <EditItemModal
                item={item}
                listId={LIST_ID}
                onClose={() => {}}
                onItemUpdated={() => {}}
                onListNotFound={() => {}}
                onReloadItem={() => Promise.reject(new Error("Nope"))}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Save" }));
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
            http.patch(updateUrl(item), () => {
                return HttpResponse.json(
                    { message: "List not found." },
                    { status: 404 },
                );
            }),
        );
        const { user } = render(
            <EditItemModal
                item={item}
                listId={LIST_ID}
                onClose={() => {}}
                onItemUpdated={() => {}}
                onListNotFound={onListNotFound}
                onReloadItem={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(onListNotFound).toHaveBeenCalledOnce();
        });
    });
});
