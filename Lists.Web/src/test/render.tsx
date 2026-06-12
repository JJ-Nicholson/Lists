import {
    render as testingLibraryRender,
    type RenderOptions,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router";

import { setAuth0Mock, type Auth0MockOverrides } from "./auth0";

type TestRenderOptions = RenderOptions & {
    auth0?: Auth0MockOverrides;
    route?: string;
};

type TestProvidersProps = {
    children: ReactNode;
    route: string;
};

function TestProviders({ children, route }: TestProvidersProps) {
    return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
}

function render(ui: ReactElement, options: TestRenderOptions = {}) {
    const { auth0, route = "/", ...renderOptions } = options;
    const auth0Value = setAuth0Mock(auth0);

    return {
        auth0: auth0Value,
        user: userEvent.setup(),
        ...testingLibraryRender(ui, {
            ...renderOptions,
            wrapper: ({ children }) => (
                <TestProviders route={route}>{children}</TestProviders>
            ),
        }),
    };
}

export * from "@testing-library/react";
export { render };
