import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "../../api/client";
import { fireEvent, render, screen, waitFor } from "../../test/render";
import { server } from "../../test/server";
import CreateItemModal from "./CreateItemModal";

const LIST_ID = "1";
const createUrl = buildApiUrl(`/lists/${LIST_ID}/items`).toString();

describe("CreateItemModal", () => {
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
            <CreateItemModal
                listId={LIST_ID}
                onClose={() => {}}
                onItemCreated={() => {}}
                onListNotFound={() => {}}
                unitLabel="items"
            />,
        );
        fireEvent.change(screen.getByLabelText("Entry name"), {
            target: { value: name },
        });
        fireEvent.change(screen.getByLabelText("Amount (items)"), {
            target: { value: amount },
        });

        fireEvent.submit(document.getElementById("create-item-form")!);

        expect(screen.getByRole("alert")).toHaveTextContent(message);
    });

    it("submits trimmed values and calls callbacks on success", async () => {
        const bodies: unknown[] = [];
        const onClose = vi.fn();
        const onItemCreated = vi.fn();
        server.use(
            http.post(createUrl, async ({ request }) => {
                bodies.push(await request.json());
                return new HttpResponse(null, { status: 204 });
            }),
        );
        const { user } = render(
            <CreateItemModal
                listId={LIST_ID}
                onClose={onClose}
                onItemCreated={onItemCreated}
                onListNotFound={() => {}}
                unitLabel="items"
            />,
        );

        await user.type(screen.getByLabelText("Entry name"), " Milk ");
        await user.type(screen.getByLabelText("Amount (items)"), "5");
        await user.click(screen.getByRole("button", { name: "Create" }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledOnce();
        });
        expect(onItemCreated).toHaveBeenCalledOnce();
        expect(bodies).toEqual([{ name: "Milk", amount: 5 }]);
    });

    it("shows an API error", async () => {
        server.use(
            http.post(createUrl, () => {
                return HttpResponse.json(
                    { message: "Could not add Milk." },
                    { status: 409 },
                );
            }),
        );
        const { user } = render(
            <CreateItemModal
                listId={LIST_ID}
                onClose={() => {}}
                onItemCreated={() => {}}
                onListNotFound={() => {}}
            />,
        );

        await user.type(screen.getByLabelText("Entry name"), "Milk");
        await user.type(screen.getByLabelText("Amount"), "5");
        await user.click(screen.getByRole("button", { name: "Create" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not add Milk.",
        );
    });

    it("reports when the list is unavailable", async () => {
        const onListNotFound = vi.fn();
        server.use(
            http.post(createUrl, () => {
                return HttpResponse.json(
                    { message: "List not found." },
                    { status: 404 },
                );
            }),
        );
        const { user } = render(
            <CreateItemModal
                listId={LIST_ID}
                onClose={() => {}}
                onItemCreated={() => {}}
                onListNotFound={onListNotFound}
            />,
        );

        await user.type(screen.getByLabelText("Entry name"), "Milk");
        await user.type(screen.getByLabelText("Amount"), "5");
        await user.click(screen.getByRole("button", { name: "Create" }));

        await waitFor(() => {
            expect(onListNotFound).toHaveBeenCalledOnce();
        });
    });
});
