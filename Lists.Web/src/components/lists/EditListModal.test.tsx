import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "../../api/client";
import type { ListSummary } from "../../api/lists";
import { render, screen, waitFor } from "../../test/render";
import { server } from "../../test/server";
import EditListModal from "./EditListModal";

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

function mockUpdateConflict(list: ListSummary): void {
    server.use(
        http.patch(buildApiUrl(`/lists/${list.id}`).toString(), () => {
            return HttpResponse.json(
                { message: "List was modified. Reload and try again." },
                { status: 409 },
            );
        }),
    );
}

describe("EditListModal", () => {
    it("validates a blank list name", async () => {
        const { user } = render(
            <EditListModal
                list={createList()}
                onClose={() => {}}
                onListUpdated={() => {}}
                onReloadList={() => {}}
            />,
        );

        await user.clear(screen.getByLabelText("List name"));
        await user.type(screen.getByLabelText("List name"), "   ");
        await user.click(screen.getByRole("button", { name: "Save" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Enter a list name.",
        );
    });

    it("submits trimmed list values and calls callbacks on success", async () => {
        const list = createList();
        const bodies: unknown[] = [];
        const onClose = vi.fn();
        const onListUpdated = vi.fn();
        server.use(
            http.patch(buildApiUrl(`/lists/${list.id}`).toString(), async ({ request }) => {
                bodies.push(await request.json());

                return HttpResponse.json({
                    id: list.id,
                    name: "Hardware",
                    unitLabel: "tools",
                    version: 8,
                    items: [],
                });
            }),
        );
        const { user } = render(
            <EditListModal
                list={list}
                onClose={onClose}
                onListUpdated={onListUpdated}
                onReloadList={() => {}}
            />,
        );

        await user.clear(screen.getByLabelText("List name"));
        await user.type(screen.getByLabelText("List name"), " Hardware ");
        await user.clear(screen.getByLabelText("Units (optional)"));
        await user.type(screen.getByLabelText("Units (optional)"), " tools ");
        await user.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledOnce();
        });
        expect(onListUpdated).toHaveBeenCalledOnce();
        expect(bodies).toEqual([
            {
                name: "Hardware",
                unitLabel: "tools",
                version: list.version,
            },
        ]);
    });

    it("offers to reload after a concurrency error", async () => {
        const list = createList();
        const onReloadList = vi.fn(async () => undefined);
        mockUpdateConflict(list);
        const { user } = render(
            <EditListModal
                list={list}
                onClose={() => {}}
                onListUpdated={() => {}}
                onReloadList={onReloadList}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Save" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "This list has been modified since you last checked. " +
                "Reload to see what changed before making further changes.",
        );
        expect(
            screen.queryByRole("button", { name: "Save" }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Reload Lists" }));

        expect(onReloadList).toHaveBeenCalledWith(list);
    });

    it("keeps reload available when reloading fails", async () => {
        const list = createList();
        mockUpdateConflict(list);
        const { user } = render(
            <EditListModal
                list={list}
                onClose={() => {}}
                onListUpdated={() => {}}
                onReloadList={() => Promise.reject(new Error("Nope"))}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Save" }));
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
});
