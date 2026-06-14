import { describe, expect, it } from "vitest";

import { render, screen } from "../test/render";
import NotFoundPage from "./NotFoundPage";

describe("NotFoundPage", () => {
    it("renders the not found message and home link", () => {
        render(<NotFoundPage />);

        expect(screen.getByText("404")).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "Page Not Found" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText("That page does not exist, or it may have moved."),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Lists" }))
            .toHaveAttribute("href", "/");
    });
});
