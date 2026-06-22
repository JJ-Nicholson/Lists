import { http, HttpResponse } from "msw";
import { useNavigate } from "react-router";
import { describe, expect, it } from "vitest";

import { buildApiUrl } from "../../api/client";
import type {
    ListSummary,
    ListsPage as ListsPageResponse,
} from "../../api/lists";
import {
    DEFAULT_PAGE,
    DEFAULT_LISTS_PAGE_SIZE,
    DEFAULT_SORT_DIRECTION,
} from "./listsPageConfig";
import { act, render, screen, waitFor } from "../../test/render";
import { server } from "../../test/server";
import ListsPage from "./ListsPage";

const listsUrl = buildApiUrl("/lists").toString();
type ListsPageResponseFactory = (url: URL) => ListsPageResponse;

function createList(overrides: Partial<ListSummary> = {}): ListSummary {
    return {
        id: 1,
        name: "Groceries",
        unitLabel: "items",
        version: 1,
        itemCount: 5,
        completedItemCount: 2,
        currentUserRole: "owner",
        ownerUsername: "josh",
        ...overrides,
    };
}

function createListsPage(
    overrides: Partial<ListsPageResponse> = {},
): ListsPageResponse {
    return {
        lists: [],
        page: {
            page: 1,
            pageSize: DEFAULT_LISTS_PAGE_SIZE,
            totalCount: 0,
            totalPages: 0,
        },
        ...overrides,
    };
}

function createListsPageWithLists(
    lists: ListSummary[],
    page: Partial<ListsPageResponse["page"]> = {},
): ListsPageResponse {
    return createListsPage({
        lists,
        page: {
            page: 1,
            pageSize: DEFAULT_LISTS_PAGE_SIZE,
            totalCount: lists.length,
            totalPages: lists.length > 0 ? 1 : 0,
            ...page,
        },
    });
}

function createListsPageFromRequest(url: URL): ListsPageResponse {
    const page = Number(url.searchParams.get("page") ?? DEFAULT_PAGE);
    const pageSize = Number(
        url.searchParams.get("pageSize") ?? DEFAULT_LISTS_PAGE_SIZE,
    );

    return createListsPage({
        lists: [createList()],
        page: {
            page,
            pageSize,
            totalCount: 36,
            totalPages: 3,
        },
    });
}

function mockGetListsPage(
    response: ListsPageResponse | ListsPageResponseFactory,
    onRequest: (url: URL) => void = () => {},
): void {
    server.use(
        http.get(listsUrl, ({ request }) => {
            const url = new URL(request.url);
            const listsPage =
                typeof response === "function" ? response(url) : response;

            onRequest(url);

            return HttpResponse.json(listsPage);
        }),
    );
}

function ListsPageWithNavigation() {
    const navigate = useNavigate();

    return (
        <>
            <button onClick={() => navigate("/lists?search=hardware")}>
                Show hardware search
            </button>
            <button onClick={() => navigate(-1)}>Go back</button>
            <button onClick={() => navigate(1)}>Go forward</button>
            <ListsPage />
        </>
    );
}

describe("ListsPage", () => {
    it("shows loading and then renders fetched lists", async () => {
        mockGetListsPage(
            createListsPage({
                lists: [
                    createList({ id: 1, name: "Groceries" }),
                    createList({ id: 2, name: "Hardware" }),
                ],
                page: {
                    page: 1,
                    pageSize: DEFAULT_LISTS_PAGE_SIZE,
                    totalCount: 2,
                    totalPages: 1,
                },
            }),
        );

        render(<ListsPage />);

        expect(screen.getByText("Loading lists...")).toBeInTheDocument();
        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "Hardware" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Showing 1-2 of 2 lists")).toBeInTheDocument();
    });

    it("sends default query params on initial load", async () => {
        const requests: URL[] = [];
        mockGetListsPage(createListsPage(), (url) => {
            requests.push(url);
        });

        render(<ListsPage />);

        expect(await screen.findByText("No lists here!")).toBeInTheDocument();
        expect(requests).toHaveLength(1);
        expect(requests[0].searchParams.get("page")).toBe("1");
        expect(requests[0].searchParams.get("sortDirection")).toBe(
            DEFAULT_SORT_DIRECTION,
        );
        expect(requests[0].searchParams.has("pageSize")).toBe(false);
        expect(requests[0].searchParams.has("search")).toBe(false);
    });

    it("uses existing query params for the request and controls", async () => {
        const requests: URL[] = [];
        mockGetListsPage(
            createListsPage({
                lists: [createList({ name: "Groceries" })],
                page: {
                    page: 2,
                    pageSize: 24,
                    totalCount: 36,
                    totalPages: 2,
                },
            }),
            (url) => {
                requests.push(url);
            },
        );

        render(<ListsPage />, {
            route: "/lists?page=2&pageSize=24&search=groceries&sortDirection=desc",
        });

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        expect(requests).toHaveLength(1);
        expect(requests[0].searchParams.get("page")).toBe("2");
        expect(requests[0].searchParams.get("pageSize")).toBe("24");
        expect(requests[0].searchParams.get("search")).toBe("groceries");
        expect(requests[0].searchParams.get("sortDirection")).toBe("desc");
        expect(screen.getByLabelText("Search")).toHaveValue("groceries");
        expect(screen.getByLabelText("Sort alphabetically")).toHaveValue("desc");
        expect(screen.getByLabelText("Per page")).toHaveValue("24");
    });

    it("shows an error without the grid when the initial load fails", async () => {
        server.use(
            http.get(listsUrl, () => {
                return HttpResponse.text("Nope", { status: 500 });
            }),
        );

        render(<ListsPage />);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not load lists.",
        );
        expect(screen.queryByText("No lists here!")).not.toBeInTheDocument();
        expect(screen.queryByText("Loading lists...")).not.toBeInTheDocument();
    });

    it("shows the API message when the initial load returns a bad request", async () => {
        server.use(
            http.get(listsUrl, () => {
                return HttpResponse.json(
                    { message: "Invalid list sort direction." },
                    { status: 400 },
                );
            }),
        );

        render(<ListsPage />);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Invalid list sort direction.",
        );
        expect(screen.queryByText("No lists here!")).not.toBeInTheDocument();
    });

    it("reloads after the initial load fails", async () => {
        let requestCount = 0;
        server.use(
            http.get(listsUrl, () => {
                requestCount += 1;

                return requestCount === 1
                    ? HttpResponse.text("Nope", { status: 500 })
                    : HttpResponse.json(
                          createListsPageWithLists([
                              createList({ name: "Hardware" }),
                          ]),
                      );
            }),
        );
        const { user } = render(<ListsPage />);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not load lists.",
        );
        await user.click(screen.getByRole("button", { name: "Reload Lists" }));

        expect(
            await screen.findByRole("heading", { name: "Hardware" }),
        ).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(requestCount).toBe(2);
    });

    it("debounces search, resets the page, and disables stale list actions", async () => {
        const requests: URL[] = [];
        mockGetListsPage(createListsPageFromRequest, (url) => {
            requests.push(url);
        });
        const { user } = render(<ListsPage />, {
            route: "/lists?page=2",
        });

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.type(screen.getByLabelText("Search"), "milk");

        expect(screen.getByLabelText("Search")).toHaveValue("milk");
        expect(requests).toHaveLength(1);
        expect(
            screen.getByRole("button", { name: "Edit Groceries" }),
        ).toBeDisabled();
        expect(
            screen.queryByRole("link", { name: "Open Groceries" }),
        ).not.toBeInTheDocument();

        await waitFor(() => {
            expect(requests).toHaveLength(2);
        });

        expect(requests[1].searchParams.get("search")).toBe("milk");
        expect(requests[1].searchParams.get("page")).toBe("1");
        expect(screen.getByLabelText("Search")).toHaveValue("milk");
        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: "Edit Groceries" }),
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
            http.get(listsUrl, async ({ request }) => {
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
                    createListsPageWithLists([createList({ name })]),
                );
            }),
        );
        const { user } = render(<ListsPage />);

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.type(screen.getByLabelText("Search"), "milk");
        await waitFor(() => {
            expect(screen.getByLabelText("Search")).toHaveValue("milk");
            expect(
                screen.getByRole("button", { name: "Edit Groceries" }),
            ).toBeDisabled();
        });
        await milkRequestStarted;
        await user.clear(screen.getByLabelText("Search"));
        await user.type(screen.getByLabelText("Search"), "bread");

        expect(
            await screen.findByRole("heading", { name: "Bread" }),
        ).toBeInTheDocument();

        await act(async () => {
            releaseMilkResponse();
        });
        await waitFor(() => {
            expect(milkResponseFinished).toBe(true);
        });
        expect(
            screen.getByRole("heading", { name: "Bread" }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "Milk" }),
        ).not.toBeInTheDocument();
    });

    it("restores the search input after history navigation", async () => {
        mockGetListsPage(createListsPageFromRequest);
        const { user } = render(<ListsPageWithNavigation />, {
            route: "/lists?search=groceries",
        });

        expect(await screen.findByLabelText("Search")).toHaveValue("groceries");
        await user.click(
            screen.getByRole("button", { name: "Show hardware search" }),
        );
        await waitFor(() => {
            expect(screen.getByLabelText("Search")).toHaveValue("hardware");
        });

        await user.click(screen.getByRole("button", { name: "Go back" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Search")).toHaveValue("groceries");
        });

        await user.click(screen.getByRole("button", { name: "Go forward" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Search")).toHaveValue("hardware");
        });
    });

    it("resets the page and reloads when the sort direction changes", async () => {
        const requests: URL[] = [];
        mockGetListsPage(createListsPageFromRequest, (url) => {
            requests.push(url);
        });
        const { user } = render(<ListsPage />, {
            route: "/lists?page=2",
        });

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.selectOptions(
            screen.getByLabelText("Sort alphabetically"),
            "desc",
        );

        await waitFor(() => {
            expect(requests).toHaveLength(2);
        });
        expect(requests[1].searchParams.get("page")).toBe("1");
        expect(requests[1].searchParams.get("sortDirection")).toBe("desc");
    });

    it("reloads the selected page when the next page is clicked", async () => {
        const requests: URL[] = [];
        mockGetListsPage(createListsPageFromRequest, (url) => {
            requests.push(url);
        });
        const { user } = render(<ListsPage />);

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Next page" }));

        await waitFor(() => {
            expect(requests).toHaveLength(2);
        });
        expect(requests[1].searchParams.get("page")).toBe("2");
    });

    it("resets the page and reloads when the page size changes", async () => {
        const requests: URL[] = [];
        mockGetListsPage(createListsPageFromRequest, (url) => {
            requests.push(url);
        });
        const { user } = render(<ListsPage />, {
            route: "/lists?page=2&pageSize=24",
        });

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.selectOptions(screen.getByLabelText("Per page"), "48");

        await waitFor(() => {
            expect(requests).toHaveLength(2);
        });
        expect(requests[1].searchParams.get("page")).toBe("1");
        expect(requests[1].searchParams.get("pageSize")).toBe("48");
    });

    it("reloads with the returned page when the API clamps the requested page", async () => {
        const requests: URL[] = [];
        mockGetListsPage(
            () =>
                createListsPage({
                    lists: [createList()],
                    page: {
                        page: 3,
                        pageSize: DEFAULT_LISTS_PAGE_SIZE,
                        totalCount: 36,
                        totalPages: 3,
                    },
                }),
            (url) => {
                requests.push(url);
            },
        );

        render(<ListsPage />, {
            route: "/lists?page=999",
        });

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await waitFor(() => {
            expect(requests).toHaveLength(2);
        });
        expect(requests[0].searchParams.get("page")).toBe("999");
        expect(requests[1].searchParams.get("page")).toBe("3");
    });

    it("keeps stale lists when a later load fails and replaces them on reload", async () => {
        let requestCount = 0;
        server.use(
            http.get(listsUrl, () => {
                requestCount += 1;

                if (requestCount === 1) {
                    return HttpResponse.json(
                        createListsPage({
                            lists: [createList()],
                            page: {
                                page: 1,
                                pageSize: DEFAULT_LISTS_PAGE_SIZE,
                                totalCount: 1,
                                totalPages: 1,
                            },
                        }),
                    );
                }

                if (requestCount === 3) {
                    return HttpResponse.json(
                        createListsPageWithLists([
                            createList({ name: "Hardware" }),
                        ]),
                    );
                }

                return HttpResponse.text("Nope", { status: 500 });
            }),
        );
        const { user } = render(<ListsPage />);

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.selectOptions(
            screen.getByLabelText("Sort alphabetically"),
            "desc",
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not load lists.",
        );
        expect(
            screen.getByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText("Showing 1-1 of 1 list"),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Reload Lists" }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Reload Lists" }));

        expect(
            await screen.findByRole("heading", { name: "Hardware" }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "Groceries" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(requestCount).toBe(3);
    });

    it("reloads fresh list values into an edit dialog after a conflict", async () => {
        const staleList = createList({ version: 7 });
        const freshList = createList({
            name: "Hardware",
            unitLabel: "tools",
            version: 8,
        });
        const bodies: unknown[] = [];
        let getRequestCount = 0;
        server.use(
            http.get(listsUrl, () => {
                getRequestCount += 1;
                const list = getRequestCount === 1 ? staleList : freshList;

                return HttpResponse.json(
                    createListsPageWithLists([list]),
                );
            }),
            http.patch(
                buildApiUrl(`/lists/${staleList.id}`).toString(),
                async ({ request }) => {
                    bodies.push(await request.json());

                    return bodies.length === 1
                        ? HttpResponse.json(
                              {
                                  message:
                                      "List was modified. Reload and try again.",
                              },
                              { status: 409 },
                          )
                        : HttpResponse.json({ ...freshList, items: [] });
                },
            ),
        );
        const { user } = render(<ListsPage />);

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole("button", { name: "Edit Groceries" }),
        );
        await user.click(screen.getByRole("button", { name: "Save" }));
        await user.click(
            await screen.findByRole("button", { name: "Reload Lists" }),
        );

        await waitFor(() => {
            expect(screen.getByLabelText("List name")).toHaveValue("Hardware");
            expect(screen.getByLabelText("Units (optional)")).toHaveValue(
                "tools",
            );
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

    it("closes an edit dialog when its list disappears during reload", async () => {
        const list = createList({ version: 7 });
        let getRequestCount = 0;
        server.use(
            http.get(listsUrl, () => {
                getRequestCount += 1;

                return HttpResponse.json(
                    createListsPageWithLists(
                        getRequestCount === 1 ? [list] : [],
                    ),
                );
            }),
            http.patch(buildApiUrl(`/lists/${list.id}`).toString(), () => {
                return HttpResponse.json(
                    { message: "List was modified. Reload and try again." },
                    { status: 409 },
                );
            }),
        );
        const { user } = render(<ListsPage />);

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole("button", { name: "Edit Groceries" }),
        );
        await user.click(screen.getByRole("button", { name: "Save" }));
        await user.click(
            await screen.findByRole("button", { name: "Reload Lists" }),
        );

        await waitFor(() => {
            expect(
                screen.queryByRole("dialog", { name: "Edit List" }),
            ).not.toBeInTheDocument();
        });
        expect(screen.getByText("No lists here!")).toBeInTheDocument();
    });

    it("closes a delete dialog and preserves the query when reloading", async () => {
        const list = createList({ version: 7 });
        const requests: URL[] = [];
        server.use(
            http.get(listsUrl, ({ request }) => {
                requests.push(new URL(request.url));

                return HttpResponse.json(
                    createListsPageWithLists([list], {
                        page: 2,
                        pageSize: 24,
                        totalCount: 36,
                        totalPages: 2,
                    }),
                );
            }),
            http.delete(buildApiUrl(`/lists/${list.id}`).toString(), () => {
                return HttpResponse.json(
                    { message: "List was modified. Reload and try again." },
                    { status: 409 },
                );
            }),
        );
        const { user } = render(<ListsPage />, {
            route: "/lists?page=2&pageSize=24&search=groceries&sortDirection=desc",
        });

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole("button", { name: "Delete Groceries" }),
        );
        await user.click(screen.getByRole("button", { name: "Delete" }));
        await user.click(
            await screen.findByRole("button", { name: "Reload Lists" }),
        );

        await waitFor(() => {
            expect(
                screen.queryByRole("dialog", { name: "Delete List" }),
            ).not.toBeInTheDocument();
        });
        expect(requests).toHaveLength(2);
        expect(requests[1].searchParams.get("page")).toBe("2");
        expect(requests[1].searchParams.get("pageSize")).toBe("24");
        expect(requests[1].searchParams.get("search")).toBe("groceries");
        expect(requests[1].searchParams.get("sortDirection")).toBe("desc");
    });

    it("closes an access dialog when its list disappears during reload", async () => {
        const list = createList();
        let getRequestCount = 0;
        server.use(
            http.get(listsUrl, () => {
                getRequestCount += 1;

                return HttpResponse.json(
                    createListsPageWithLists(
                        getRequestCount === 1 ? [list] : [],
                    ),
                );
            }),
            http.get(buildApiUrl(`/lists/${list.id}/access`).toString(), () => {
                return HttpResponse.json(
                    { message: "List not found." },
                    { status: 404 },
                );
            }),
        );
        const { user } = render(<ListsPage />);

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole("button", {
                name: "Review access to Groceries",
            }),
        );
        await user.click(
            await screen.findByRole("button", { name: "Reload Lists" }),
        );

        await waitFor(() => {
            expect(
                screen.queryByRole("dialog", { name: "Review Access" }),
            ).not.toBeInTheDocument();
        });
        expect(getRequestCount).toBe(2);
    });
});
