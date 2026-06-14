import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import App from "./App";
import { buildApiUrl } from "./api/client";
import type { ListsPage as ListsPageResponse } from "./api/lists";
import type { User } from "./api/users";
import { DEFAULT_LISTS_PAGE_SIZE } from "./pages/lists/listsPageConfig";
import { render, screen } from "./test/render";
import { server } from "./test/server";

const userUrl = buildApiUrl("/user").toString();
const listsUrl = buildApiUrl("/lists").toString();

function createListsPage(): ListsPageResponse {
    return {
        lists: [],
        page: {
            page: 1,
            pageSize: DEFAULT_LISTS_PAGE_SIZE,
            totalCount: 0,
            totalPages: 0,
        },
    };
}

function mockCurrentUser(
    user: User,
    onRequest: (request: Request) => void = () => {},
): void {
    server.use(
        http.get(userUrl, ({ request }) => {
            onRequest(request);

            return HttpResponse.json(user);
        }),
    );
}

function mockListsPage(): void {
    server.use(
        http.get(listsUrl, () => {
            return HttpResponse.json(createListsPage());
        }),
    );
}

describe("App username routes", () => {
    it("redirects lists routes to setup profile when the user needs a username", async () => {
        mockCurrentUser({
            username: null,
            needsUsername: true,
        });

        render(<App />, { route: "/lists" });

        expect(
            await screen.findByRole("heading", { name: "Choose a username" }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "Your Lists" }),
        ).not.toBeInTheDocument();
    });

    it("renders lists routes when the user has a username", async () => {
        const authorisationHeaders: (string | null)[] = [];
        mockCurrentUser(
            {
                username: "josh",
                needsUsername: false,
            },
            (request) => {
                authorisationHeaders.push(request.headers.get("Authorization"));
            },
        );
        mockListsPage();

        render(<App />, { route: "/lists" });

        expect(
            await screen.findByRole("heading", { name: "Your Lists" }),
        ).toBeInTheDocument();
        expect(await screen.findByText("No lists here!")).toBeInTheDocument();
        expect(authorisationHeaders).toEqual(["Bearer test-access-token"]);
    });

    it("shows an error when the profile cannot be loaded", async () => {
        server.use(
            http.get(userUrl, () => {
                return HttpResponse.text("Nope", { status: 500 });
            }),
        );

        render(<App />, { route: "/lists" });

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not check your profile. Refresh the page and try again.",
        );
        expect(
            screen.queryByRole("heading", { name: "Your Lists" }),
        ).not.toBeInTheDocument();
    });
});
