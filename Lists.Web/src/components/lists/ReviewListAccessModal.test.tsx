import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "../../api/client";
import type { ListAccessEntry, ListSummary } from "../../api/lists";
import { render, screen, waitFor, within } from "../../test/render";
import { server } from "../../test/server";
import ReviewListAccessModal from "./ReviewListAccessModal";

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

function accessUrl(listId: number): string {
    return buildApiUrl(`/lists/${listId}/access`).toString();
}

function reloadList(): Promise<boolean> {
    return Promise.resolve(true);
}

function mockAccessEntries(
    list: ListSummary,
    entries: ListAccessEntry[],
): void {
    server.use(
        http.get(accessUrl(list.id), () => {
            return HttpResponse.json(entries);
        }),
    );
}

describe("ReviewListAccessModal", () => {
    it("loads access entries, sorts owners first, and only allows revoking editors", async () => {
        const list = createList();
        mockAccessEntries(list, [
            { username: "alex", role: "editor" },
            { username: "josh", role: "owner" },
        ]);

        render(
            <ReviewListAccessModal
                list={list}
                onClose={() => {}}
                onReloadList={reloadList}
            />,
        );

        const accessItems = await screen.findAllByRole("listitem");

        expect(within(accessItems[0]).getByText("josh")).toBeInTheDocument();
        expect(within(accessItems[1]).getByText("alex")).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Revoke" })).toHaveLength(1);
    });

    it("lets editors view access without managing it", async () => {
        const list = createList({ currentUserRole: "editor" });
        mockAccessEntries(list, [
            { username: "alex", role: "editor" },
            { username: "josh", role: "owner" },
        ]);

        render(
            <ReviewListAccessModal
                list={list}
                onClose={() => {}}
                onReloadList={reloadList}
            />,
        );

        expect(await screen.findByText("josh")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Revoke" }))
            .not.toBeInTheDocument();
        expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Grant access" }))
            .not.toBeInTheDocument();
    });

    it("grants access and reloads entries", async () => {
        const list = createList();
        const bodies: unknown[] = [];
        let entries: ListAccessEntry[] = [
            { username: "josh", role: "owner" },
        ];
        server.use(
            http.get(accessUrl(list.id), () => {
                return HttpResponse.json(entries);
            }),
            http.post(accessUrl(list.id), async ({ request }) => {
                bodies.push(await request.json());
                entries = [
                    ...entries,
                    { username: "alex", role: "editor" },
                ];

                return new HttpResponse(null, { status: 204 });
            }),
        );
        const { user } = render(
            <ReviewListAccessModal
                list={list}
                onClose={() => {}}
                onReloadList={reloadList}
            />,
        );

        expect(await screen.findByText("josh")).toBeInTheDocument();
        await user.type(screen.getByLabelText("Username"), " alex ");
        await user.click(screen.getByRole("button", { name: "Grant access" }));

        await waitFor(() => {
            expect(bodies).toEqual([{ username: "alex" }]);
        });
        expect(await screen.findByText("alex")).toBeInTheDocument();
        expect(screen.getByLabelText("Username")).toHaveValue("");
    });

    it("revokes access and reloads entries", async () => {
        const list = createList();
        const requests: URL[] = [];
        let entries: ListAccessEntry[] = [
            { username: "josh", role: "owner" },
            { username: "alex", role: "editor" },
        ];
        server.use(
            http.get(accessUrl(list.id), () => {
                return HttpResponse.json(entries);
            }),
            http.delete(`${accessUrl(list.id)}/:username`, ({ request }) => {
                requests.push(new URL(request.url));
                entries = [{ username: "josh", role: "owner" }];

                return new HttpResponse(null, { status: 204 });
            }),
        );
        const { user } = render(
            <ReviewListAccessModal
                list={list}
                onClose={() => {}}
                onReloadList={reloadList}
            />,
        );

        expect(await screen.findByText("alex")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Revoke" }));

        await waitFor(() => {
            expect(requests).toHaveLength(1);
        });
        expect(requests[0].pathname).toBe("/lists/1/access/alex");
        await waitFor(() => {
            expect(screen.queryByText("alex")).not.toBeInTheDocument();
        });
    });

    it("offers to reload lists when the list is unavailable", async () => {
        const list = createList();
        server.use(
            http.get(accessUrl(list.id), () => {
                return HttpResponse.json(
                    { message: "List not found." },
                    { status: 404 },
                );
            }),
        );

        render(
            <ReviewListAccessModal
                list={list}
                onClose={() => {}}
                onReloadList={reloadList}
            />,
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "This list does not exist, was deleted, or you no longer have access.",
        );
        expect(
            screen.getByRole("button", { name: "Reload Lists" }),
        ).toBeInTheDocument();
    });

    it("retries access loading after an ordinary load error", async () => {
        const list = createList();
        let requestCount = 0;
        server.use(
            http.get(accessUrl(list.id), () => {
                requestCount += 1;

                return requestCount === 1
                    ? HttpResponse.text("Nope", { status: 500 })
                    : HttpResponse.json([
                          { username: "josh", role: "owner" },
                      ]);
            }),
        );
        const { user } = render(
            <ReviewListAccessModal
                list={list}
                onClose={() => {}}
                onReloadList={reloadList}
            />,
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Failed to load list access.",
        );
        await user.click(screen.getByRole("button", { name: "Reload" }));

        expect(await screen.findByText("josh")).toBeInTheDocument();
        expect(requestCount).toBe(2);
    });

    it("reloads access after the list becomes available", async () => {
        const list = createList();
        const onReloadList = vi.fn(async () => true);
        let requestCount = 0;
        server.use(
            http.get(accessUrl(list.id), () => {
                requestCount += 1;

                return requestCount === 1
                    ? HttpResponse.json(
                          { message: "List not found." },
                          { status: 404 },
                      )
                    : HttpResponse.json([
                          { username: "josh", role: "owner" },
                      ]);
            }),
        );
        const { user } = render(
            <ReviewListAccessModal
                list={list}
                onClose={() => {}}
                onReloadList={onReloadList}
            />,
        );

        await user.click(
            await screen.findByRole("button", { name: "Reload Lists" }),
        );

        expect(onReloadList).toHaveBeenCalledWith(list);
        expect(await screen.findByText("josh")).toBeInTheDocument();
        expect(requestCount).toBe(2);
    });

    it("keeps list reload available when reloading fails", async () => {
        const list = createList();
        server.use(
            http.get(accessUrl(list.id), () => {
                return HttpResponse.json(
                    { message: "List not found." },
                    { status: 404 },
                );
            }),
        );
        const { user } = render(
            <ReviewListAccessModal
                list={list}
                onClose={() => {}}
                onReloadList={() => Promise.reject(new Error("Nope"))}
            />,
        );

        await user.click(
            await screen.findByRole("button", { name: "Reload Lists" }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not reload lists.",
        );
        expect(
            screen.getByRole("button", { name: "Reload Lists" }),
        ).toBeInTheDocument();
    });
});
