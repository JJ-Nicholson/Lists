import type { ReactElement } from "react";
import { http, HttpResponse } from "msw";
import { Route, Routes, useNavigate } from "react-router";
import { describe, expect, it } from "vitest";

import { buildApiUrl } from "../../api/client";
import type { ListDetails, ListItem } from "../../api/lists";
import { act, render, screen, waitFor, within } from "../../test/render";
import { server } from "../../test/server";
import ListPage from "./ListPage";

const LIST_ID = 1;

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

function createListDetails(
    overrides: Partial<ListDetails> = {},
): ListDetails {
    const { items = [], ...listOverrides } = overrides;

    return {
        id: LIST_ID,
        name: "Groceries",
        unitLabel: "items",
        version: 3,
        items,
        totalAmount: items.reduce((total, item) => total + item.amount, 0),
        ...listOverrides,
    };
}

function listUrl(listId: number | string = LIST_ID): string {
    return buildApiUrl(`/lists/${listId}`).toString();
}

function itemUrl(itemId: number): string {
    return buildApiUrl(`/lists/${LIST_ID}/items/${itemId}`).toString();
}

function bulkUrl(action: "mark-complete" | "mark-incomplete"): string {
    return buildApiUrl(`/lists/${LIST_ID}/items/${action}`).toString();
}

function mockGetList(
    response: ListDetails | ((url: URL) => ListDetails),
    onRequest: (url: URL) => void = () => {},
): void {
    server.use(
        http.get(listUrl(), ({ request }) => {
            const url = new URL(request.url);
            onRequest(url);

            return HttpResponse.json(
                typeof response === "function" ? response(url) : response,
            );
        }),
    );
}

function renderListPage(
    route = `/lists/${LIST_ID}`,
    element: ReactElement = <ListPage />,
) {
    return render(
        <Routes>
            <Route path="/lists/:listId" element={element} />
        </Routes>,
        { route },
    );
}

function ListPageWithNavigation() {
    const navigate = useNavigate();

    return (
        <>
            <button onClick={() => navigate(`/lists/${LIST_ID}?search=bread`)}>
                Show bread search
            </button>
            <button onClick={() => navigate(-1)}>Go back</button>
            <button onClick={() => navigate(1)}>Go forward</button>
            <ListPage />
        </>
    );
}

describe("ListPage", () => {
    it("loads the list with default query values", async () => {
        const requests: URL[] = [];
        mockGetList(
            createListDetails({
                unitLabel: "$",
                items: [
                    createItem(),
                    createItem({
                        id: 2,
                        name: "Bread",
                        amount: 3.25,
                        isCompleted: true,
                    }),
                ],
            }),
            (url) => requests.push(url),
        );

        renderListPage();

        expect(screen.getByText("Loading...")).toBeInTheDocument();
        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Milk")).toBeInTheDocument();
        expect(screen.getByText("Bread")).toBeInTheDocument();
        expect(screen.getByText("$8.25")).toBeInTheDocument();
        expect(requests).toHaveLength(1);
        expect(requests[0].searchParams.has("search")).toBe(false);
        expect(requests[0].searchParams.get("status")).toBe("all");
        expect(requests[0].searchParams.get("sortBy")).toBe("name");
        expect(requests[0].searchParams.get("sortDirection")).toBe("asc");
    });

    it("uses existing query values in the request and controls", async () => {
        const requests: URL[] = [];
        mockGetList(
            createListDetails({ items: [createItem()], totalAmount: 5 }),
            (url) => requests.push(url),
        );

        renderListPage(
            `/lists/${LIST_ID}?search=milk&status=active&sortBy=amount&sortDirection=desc`,
        );

        expect(await screen.findByText("Milk")).toBeInTheDocument();
        expect(requests).toHaveLength(1);
        expect(requests[0].searchParams.get("search")).toBe("milk");
        expect(requests[0].searchParams.get("status")).toBe("active");
        expect(requests[0].searchParams.get("sortBy")).toBe("amount");
        expect(requests[0].searchParams.get("sortDirection")).toBe("desc");
        expect(screen.getByLabelText("Search")).toHaveValue("milk");
        expect(screen.getByLabelText("Filter by")).toHaveValue("active");
        expect(screen.getByLabelText("Sort by")).toHaveValue("amount");
        expect(screen.getByLabelText("Sort direction")).toHaveValue("desc");
        expect(screen.getByText("Filtered Total:")).toBeInTheDocument();
    });

    it.each([
        { route: `/lists/${LIST_ID}`, message: "No entries yet" },
        {
            route: `/lists/${LIST_ID}?search=missing`,
            message: "No matching entries",
        },
    ])("shows $message when the list is empty", async ({ route, message }) => {
        mockGetList(createListDetails());

        renderListPage(route);

        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(screen.queryByText("Total:")).not.toBeInTheDocument();
    });

    it("shows not found when the list is unavailable", async () => {
        server.use(
            http.get(listUrl(), () => {
                return HttpResponse.json(
                    { message: "List not found." },
                    { status: 404 },
                );
            }),
        );

        renderListPage();

        expect(
            await screen.findByRole("heading", { name: "Page Not Found" }),
        ).toBeInTheDocument();
    });

    it("shows a plain error when the initial load fails", async () => {
        server.use(
            http.get(listUrl(), () => {
                return HttpResponse.text("Nope", { status: 500 });
            }),
        );

        renderListPage();

        expect(await screen.findByText("Could not load list.")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("debounces search and disables stale item actions", async () => {
        const requests: URL[] = [];
        mockGetList(
            createListDetails({ items: [createItem()] }),
            (url) => requests.push(url),
        );
        const { user } = renderListPage();

        expect(await screen.findByText("Milk")).toBeInTheDocument();
        await user.type(screen.getByLabelText("Search"), "milk");

        expect(requests).toHaveLength(1);
        expect(screen.getByLabelText("Search")).toHaveValue("milk");
        expect(
            screen.getByRole("checkbox", { name: "Mark Milk as completed" }),
        ).toBeDisabled();
        expect(screen.getByRole("button", { name: "Edit Milk" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Add Entry" })).toBeDisabled();

        await waitFor(() => {
            expect(requests).toHaveLength(2);
        });
        expect(requests[1].searchParams.get("search")).toBe("milk");
        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: "Edit Milk" }),
            ).toBeEnabled();
        });
    });

    it("does not let a stale search response overwrite newer results", async () => {
        let markMilkRequestStarted = () => {};
        let releaseMilkResponse = () => {};
        let milkResponseFinished = false;
        const milkRequestStarted = new Promise<void>((resolve) => {
            markMilkRequestStarted = resolve;
        });
        const milkResponsePending = new Promise<void>((resolve) => {
            releaseMilkResponse = resolve;
        });
        server.use(
            http.get(listUrl(), async ({ request }) => {
                const search = new URL(request.url).searchParams.get("search");

                if (search === "milk") {
                    markMilkRequestStarted();
                    await milkResponsePending;
                    milkResponseFinished = true;
                }

                const name =
                    search === "milk"
                        ? "Milk"
                        : search === "bread"
                          ? "Bread"
                          : "Groceries";

                return HttpResponse.json(
                    createListDetails({
                        items: [createItem({ name })],
                    }),
                );
            }),
        );
        const { user } = renderListPage();

        expect(
            await screen.findByRole("button", { name: "Edit Groceries" }),
        ).toBeInTheDocument();
        await user.type(screen.getByLabelText("Search"), "milk");
        await milkRequestStarted;
        await user.clear(screen.getByLabelText("Search"));
        await user.type(screen.getByLabelText("Search"), "bread");

        expect(await screen.findByText("Bread")).toBeInTheDocument();
        await act(async () => {
            releaseMilkResponse();
        });
        await waitFor(() => {
            expect(milkResponseFinished).toBe(true);
        });
        expect(screen.getByText("Bread")).toBeInTheDocument();
        expect(screen.queryByText("Milk")).not.toBeInTheDocument();
    });

    it("restores search after back and forward navigation", async () => {
        mockGetList(createListDetails());
        const { user } = renderListPage(
            `/lists/${LIST_ID}?search=milk`,
            <ListPageWithNavigation />,
        );

        expect(await screen.findByLabelText("Search")).toHaveValue("milk");
        await user.click(
            screen.getByRole("button", { name: "Show bread search" }),
        );
        await waitFor(() => {
            expect(screen.getByLabelText("Search")).toHaveValue("bread");
        });
        await user.click(screen.getByRole("button", { name: "Go back" }));
        await waitFor(() => {
            expect(screen.getByLabelText("Search")).toHaveValue("milk");
        });
        await user.click(screen.getByRole("button", { name: "Go forward" }));
        await waitFor(() => {
            expect(screen.getByLabelText("Search")).toHaveValue("bread");
        });
    });

    it("updates an item completion state and refreshes the list", async () => {
        const item = createItem();
        const bodies: unknown[] = [];
        let getRequestCount = 0;
        server.use(
            http.get(listUrl(), () => {
                getRequestCount += 1;

                return HttpResponse.json(
                    createListDetails({
                        items: [
                            getRequestCount === 1
                                ? item
                                : { ...item, isCompleted: true, version: 8 },
                        ],
                    }),
                );
            }),
            http.patch(itemUrl(item.id), async ({ request }) => {
                bodies.push(await request.json());
                return HttpResponse.json({
                    ...item,
                    isCompleted: true,
                    version: 8,
                });
            }),
        );
        const { user } = renderListPage();

        await user.click(
            await screen.findByRole("checkbox", {
                name: "Mark Milk as completed",
            }),
        );

        expect(
            await screen.findByRole("checkbox", {
                name: "Mark Milk as not completed",
            }),
        ).toBeChecked();
        expect(bodies).toEqual([
            {
                name: "Milk",
                amount: 5,
                isCompleted: true,
                version: 7,
            },
        ]);
        expect(getRequestCount).toBe(2);
    });

    it("localises a concurrency error to the affected item", async () => {
        const milk = createItem();
        const bread = createItem({ id: 2, name: "Bread", version: 4 });
        let getRequestCount = 0;
        server.use(
            http.get(listUrl(), () => {
                getRequestCount += 1;

                return HttpResponse.json(
                    createListDetails({
                        items:
                            getRequestCount === 1
                                ? [milk, bread]
                                : [
                                      {
                                          ...milk,
                                          name: "Oat Milk",
                                          version: 8,
                                      },
                                      bread,
                                  ],
                    }),
                );
            }),
            http.patch(itemUrl(milk.id), () => {
                return HttpResponse.json(
                    { message: "Item was modified. Reload and try again." },
                    { status: 409 },
                );
            }),
        );
        const { user } = renderListPage();

        await user.click(
            await screen.findByRole("checkbox", {
                name: "Mark Milk as completed",
            }),
        );

        const milkRow = screen.getByText("Milk").closest("article");
        const breadRow = screen.getByText("Bread").closest("article");
        expect(milkRow).not.toBeNull();
        expect(breadRow).not.toBeNull();
        expect(within(milkRow!).getByRole("alert")).toHaveTextContent(
            "This entry has been modified since you last checked.",
        );
        expect(within(milkRow!).getByRole("checkbox")).toBeDisabled();
        expect(within(milkRow!).getByRole("button", { name: "Edit Milk" }))
            .toBeDisabled();
        expect(within(milkRow!).getByRole("button", { name: "Delete Milk" }))
            .toBeDisabled();
        expect(within(breadRow!).getByRole("checkbox")).toBeEnabled();
        expect(within(breadRow!).getByRole("button", { name: "Edit Bread" }))
            .toBeEnabled();
        expect(screen.getByRole("button", { name: "Add Entry" })).toBeEnabled();
        expect(
            screen.getByRole("button", { name: "Tick All Entries" }),
        ).toBeDisabled();

        await user.click(
            within(milkRow!).getByRole("button", { name: "Reload List" }),
        );

        expect(await screen.findByText("Oat Milk")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(getRequestCount).toBe(2);
    });

    it("shows not found when an item action loses list access", async () => {
        const item = createItem();
        mockGetList(createListDetails({ items: [item] }));
        server.use(
            http.patch(itemUrl(item.id), () => {
                return HttpResponse.json(
                    { message: "List not found." },
                    { status: 404 },
                );
            }),
        );
        const { user } = renderListPage();

        await user.click(
            await screen.findByRole("checkbox", {
                name: "Mark Milk as completed",
            }),
        );

        expect(
            await screen.findByRole("heading", { name: "Page Not Found" }),
        ).toBeInTheDocument();
    });

    it.each([
        {
            buttonName: "Tick All Entries",
            action: "mark-complete" as const,
            itemId: 1,
            isCompleted: true,
        },
        {
            buttonName: "Untick All Entries",
            action: "mark-incomplete" as const,
            itemId: 2,
            isCompleted: false,
        },
    ])(
        "submits only matching items for $buttonName",
        async ({ buttonName, action, itemId, isCompleted }) => {
            const milk = createItem();
            const bread = createItem({
                id: 2,
                name: "Bread",
                isCompleted: true,
                version: 4,
            });
            const bodies: unknown[] = [];
            let getRequestCount = 0;
            server.use(
                http.get(listUrl(), () => {
                    getRequestCount += 1;
                    const items =
                        getRequestCount === 1
                            ? [milk, bread]
                            : [
                                  { ...milk, isCompleted },
                                  { ...bread, isCompleted },
                              ];

                    return HttpResponse.json(createListDetails({ items }));
                }),
                http.patch(bulkUrl(action), async ({ request }) => {
                    bodies.push(await request.json());
                    return HttpResponse.json([]);
                }),
            );
            const { user } = renderListPage();

            await user.click(
                await screen.findByRole("button", { name: buttonName }),
            );

            await waitFor(() => {
                expect(getRequestCount).toBe(2);
            });
            expect(bodies).toEqual([
                {
                    items: [
                        {
                            id: itemId,
                            version: itemId === milk.id ? milk.version : bread.version,
                        },
                    ],
                },
            ]);
            const itemName = itemId === milk.id ? "Milk" : "Bread";
            const checkbox = screen.getByRole("checkbox", {
                name: `Mark ${itemName} as ${
                    isCompleted ? "not completed" : "completed"
                }`,
            });

            if (isCompleted) {
                expect(checkbox).toBeChecked();
            } else {
                expect(checkbox).not.toBeChecked();
            }
        },
    );

    it("shows bulk conflicts at page level and reloads the list", async () => {
        const milk = createItem();
        const bread = createItem({ id: 2, name: "Bread", version: 4 });
        let getRequestCount = 0;
        server.use(
            http.get(listUrl(), () => {
                getRequestCount += 1;

                return HttpResponse.json(
                    createListDetails({
                        items:
                            getRequestCount === 1
                                ? [milk, bread]
                                : [{ ...milk, isCompleted: true }, bread],
                    }),
                );
            }),
            http.patch(bulkUrl("mark-complete"), () => {
                return HttpResponse.json(
                    {
                        message:
                            "One or more items were modified. Reload and try again.",
                    },
                    { status: 409 },
                );
            }),
        );
        const { user } = renderListPage();

        await user.click(
            await screen.findByRole("button", { name: "Tick All Entries" }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Reload the list to review what changed before trying this bulk action again.",
        );
        expect(screen.getByRole("button", { name: "Edit Milk" })).toBeEnabled();
        expect(
            screen.getByRole("button", { name: "Tick All Entries" }),
        ).toBeDisabled();

        await user.click(screen.getByRole("button", { name: "Reload List" }));

        expect(
            await screen.findByRole("checkbox", {
                name: "Mark Milk as not completed",
            }),
        ).toBeChecked();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(getRequestCount).toBe(2);
    });

    it("creates an item and refreshes the list", async () => {
        const item = createItem();
        const bodies: unknown[] = [];
        let getRequestCount = 0;
        server.use(
            http.get(listUrl(), () => {
                getRequestCount += 1;
                return HttpResponse.json(
                    createListDetails({
                        items: getRequestCount === 1 ? [] : [item],
                    }),
                );
            }),
            http.post(
                buildApiUrl(`/lists/${LIST_ID}/items`).toString(),
                async ({ request }) => {
                    bodies.push(await request.json());
                    return new HttpResponse(null, { status: 204 });
                },
            ),
        );
        const { user } = renderListPage();

        expect(await screen.findByText("No entries yet")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Add Entry" }));
        await user.type(screen.getByLabelText("Entry name"), " Milk ");
        await user.type(screen.getByLabelText("Amount (items)"), "5");
        await user.click(screen.getByRole("button", { name: "Create" }));

        expect(await screen.findByText("Milk")).toBeInTheDocument();
        expect(bodies).toEqual([{ name: "Milk", amount: 5 }]);
        expect(getRequestCount).toBe(2);
    });

    it("reloads fresh item values into an edit dialog after a conflict", async () => {
        const staleItem = createItem();
        const freshItem = createItem({
            name: "Oat Milk",
            amount: 6.25,
            isCompleted: true,
            version: 8,
        });
        const bodies: unknown[] = [];
        let getRequestCount = 0;
        server.use(
            http.get(listUrl(), () => {
                getRequestCount += 1;
                return HttpResponse.json(
                    createListDetails({
                        items: [getRequestCount === 1 ? staleItem : freshItem],
                    }),
                );
            }),
            http.patch(itemUrl(staleItem.id), async ({ request }) => {
                bodies.push(await request.json());

                return bodies.length === 1
                    ? HttpResponse.json(
                          {
                              message:
                                  "Item was modified. Reload and try again.",
                          },
                          { status: 409 },
                      )
                    : HttpResponse.json(freshItem);
            }),
        );
        const { user } = renderListPage();

        await user.click(
            await screen.findByRole("button", { name: "Edit Milk" }),
        );
        await user.click(screen.getByRole("button", { name: "Save" }));
        await user.click(
            await screen.findByRole("button", { name: "Reload List" }),
        );

        await waitFor(() => {
            expect(screen.getByLabelText("Entry name")).toHaveValue("Oat Milk");
            expect(screen.getByLabelText("Amount (items)")).toHaveValue(6.25);
            expect(screen.getByLabelText("Completed")).toBeChecked();
        });
        await user.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(bodies).toHaveLength(2);
        });
        expect(bodies).toEqual([
            expect.objectContaining({ version: 7 }),
            expect.objectContaining({ version: 8 }),
        ]);
    });

    it("closes a delete dialog after reloading a conflict", async () => {
        const item = createItem();
        let getRequestCount = 0;
        mockGetList(createListDetails({ items: [item] }), () => {
            getRequestCount += 1;
        });
        server.use(
            http.delete(itemUrl(item.id), () => {
                return HttpResponse.json(
                    { message: "Item was modified. Reload and try again." },
                    { status: 409 },
                );
            }),
        );
        const { user } = renderListPage();

        await user.click(
            await screen.findByRole("button", { name: "Delete Milk" }),
        );
        await user.click(screen.getByRole("button", { name: "Delete" }));
        await user.click(
            await screen.findByRole("button", { name: "Reload List" }),
        );

        await waitFor(() => {
            expect(
                screen.queryByRole("dialog", { name: "Delete Entry" }),
            ).not.toBeInTheDocument();
        });
        expect(getRequestCount).toBe(2);
    });
});
