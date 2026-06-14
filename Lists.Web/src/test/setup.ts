import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { Auth0ProviderOptions, User } from "@auth0/auth0-react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { resetAuth0Mock } from "./auth0";
import { server } from "./server";

Object.defineProperty(window, "scrollTo", {
    value: vi.fn(),
    writable: true,
});

vi.mock("@auth0/auth0-react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@auth0/auth0-react")>();
    const { getAuth0Mock, setAuth0ProviderProps } = await import("./auth0");

    return {
        ...actual,
        Auth0Provider: (props: Auth0ProviderOptions<User>) => {
            setAuth0ProviderProps(props);

            return props.children;
        },
        useAuth0: () => getAuth0Mock(),
    };
});

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
    server.resetHandlers();
    cleanup();
    resetAuth0Mock();
});

afterAll(() => server.close());
