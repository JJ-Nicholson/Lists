import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { resetAuth0Mock } from "./auth0";

vi.mock("@auth0/auth0-react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@auth0/auth0-react")>();
    const { getAuth0Mock } = await import("./auth0");

    return {
        ...actual,
        useAuth0: () => getAuth0Mock(),
    };
});

afterEach(() => {
    cleanup();
    resetAuth0Mock();
});
