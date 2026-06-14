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

describe("EditListModal", () => {
    it("validates a blank list name", async () => {
        const { user } = render(
            <EditListModal
                list={createList()}
                onClose={() => {}}
                onListUpdated={() => {}}
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

    it("shows an API error", async () => {
        const list = createList();
        server.use(
            http.patch(buildApiUrl(`/lists/${list.id}`).toString(), () => {
                return HttpResponse.json(
                    { message: "List was modified. Reload and try again." },
                    { status: 409 },
                );
            }),
        );
        const { user } = render(
            <EditListModal
                list={list}
                onClose={() => {}}
                onListUpdated={() => {}}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Save" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "List was modified. Reload and try again.",
        );
    });
});
