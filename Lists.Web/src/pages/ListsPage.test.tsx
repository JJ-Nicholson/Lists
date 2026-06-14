import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { buildApiUrl } from "../api/client";
import type {
    ListSummary,
    ListsPage as ListsPageResponse,
} from "../api/lists";
import {
    DEFAULT_PAGE,
    DEFAULT_LISTS_PAGE_SIZE,
    DEFAULT_SORT_DIRECTION,
} from "./lists/listsPageConfig";
import { render, screen, waitFor } from "../test/render";
import { server } from "../test/server";
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

    it("updates the search input immediately and reloads after debounce", async () => {
        const requests: URL[] = [];
        mockGetListsPage(createListsPageFromRequest, (url) => {
            requests.push(url);
        });
        const { user } = render(<ListsPage />);

        expect(
            await screen.findByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        await user.type(screen.getByLabelText("Search"), "milk");

        expect(screen.getByLabelText("Search")).toHaveValue("milk");
        expect(requests).toHaveLength(1);

        await waitFor(() => {
            expect(requests).toHaveLength(2);
        });

        expect(requests[1].searchParams.get("search")).toBe("milk");
        expect(screen.getByLabelText("Search")).toHaveValue("milk");
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

    it("removes stale lists when a later load fails", async () => {
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
            screen.queryByRole("heading", { name: "Groceries" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText("Showing 1-1 of 1 list"),
        ).not.toBeInTheDocument();
    });
});
