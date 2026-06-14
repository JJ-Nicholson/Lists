import type {
    Auth0ContextInterface,
    Auth0ProviderOptions,
    User,
} from "@auth0/auth0-react";
import { vi } from "vitest";

export type Auth0MockOverrides = Partial<Auth0ContextInterface<User>>;

let auth0ProviderProps: Auth0ProviderOptions<User> | null = null;

function createAuth0Mock(
    overrides: Auth0MockOverrides = {},
): Auth0ContextInterface<User> {
    return {
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
        user: {
            name: "Test User",
            sub: "auth0|test-user",
        },
        getAccessTokenSilently: vi.fn(async () => "test-access-token") as unknown as
            Auth0ContextInterface<User>["getAccessTokenSilently"],
        loginWithRedirect: vi.fn(async () => undefined) as
            Auth0ContextInterface<User>["loginWithRedirect"],
        logout: vi.fn(async () => undefined) as
            Auth0ContextInterface<User>["logout"],
        ...overrides,
    } as Auth0ContextInterface<User>;
}

let auth0Mock = createAuth0Mock();

export function getAuth0ProviderProps(): Auth0ProviderOptions<User> {
    if (!auth0ProviderProps) {
        throw new Error("Auth0Provider was not rendered.");
    }

    return auth0ProviderProps;
}

export function getAuth0Mock(): Auth0ContextInterface<User> {
    return auth0Mock;
}

export function setAuth0ProviderProps(
    props: Auth0ProviderOptions<User>,
): void {
    auth0ProviderProps = props;
}

export function setAuth0Mock(
    overrides: Auth0MockOverrides = {},
): Auth0ContextInterface<User> {
    auth0Mock = createAuth0Mock(overrides);

    return auth0Mock;
}

export function resetAuth0Mock(): void {
    auth0Mock = createAuth0Mock();
    auth0ProviderProps = null;
}
