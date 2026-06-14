import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "../../api/client";
import { render, screen, waitFor } from "../../test/render";
import { server } from "../../test/server";
import CreateListModal from "./CreateListModal";

const listsUrl = buildApiUrl("/lists").toString();

describe("CreateListModal", () => {
    it("validates a blank list name", async () => {
        const { user } = render(
            <CreateListModal onClose={() => {}} onListCreated={() => {}} />,
        );

        await user.type(screen.getByLabelText("List name"), "   ");
        await user.click(screen.getByRole("button", { name: "Create" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Enter a list name.",
        );
    });

    it("submits trimmed list values and calls callbacks on success", async () => {
        const bodies: unknown[] = [];
        const onClose = vi.fn();
        const onListCreated = vi.fn();
        server.use(
            http.post(listsUrl, async ({ request }) => {
                bodies.push(await request.json());

                return HttpResponse.json({
                    id: 1,
                    name: "Groceries",
                    unitLabel: "items",
                    version: 1,
                    items: [],
                });
            }),
        );
        const { user } = render(
            <CreateListModal
                onClose={onClose}
                onListCreated={onListCreated}
            />,
        );

        await user.type(screen.getByLabelText("List name"), "  Groceries  ");
        await user.type(screen.getByLabelText("Units (optional)"), " items ");
        await user.click(screen.getByRole("button", { name: "Create" }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledOnce();
        });
        expect(onListCreated).toHaveBeenCalledOnce();
        expect(bodies).toEqual([
            {
                name: "Groceries",
                unitLabel: "items",
            },
        ]);
    });

    it("shows an API error", async () => {
        server.use(
            http.post(listsUrl, () => {
                return HttpResponse.json(
                    { message: "Choose a username before using lists." },
                    { status: 409 },
                );
            }),
        );
        const { user } = render(
            <CreateListModal onClose={() => {}} onListCreated={() => {}} />,
        );

        await user.type(screen.getByLabelText("List name"), "Groceries");
        await user.click(screen.getByRole("button", { name: "Create" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Choose a username before using lists.",
        );
    });
});
