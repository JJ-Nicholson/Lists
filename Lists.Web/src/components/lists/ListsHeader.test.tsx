import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../test/render";
import ListsHeader from "./ListsHeader";

describe("ListsHeader", () => {
    it("renders the page heading and create button", () => {
        render(<ListsHeader onCreateList={() => {}} />);

        expect(screen.getByText("Let's Plan!")).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "Your Lists" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Create List" }),
        ).toBeInTheDocument();
    });

    it("calls onCreateList when the create button is clicked", async () => {
        const onCreateList = vi.fn();
        const { user } = render(<ListsHeader onCreateList={onCreateList} />);

        await user.click(screen.getByRole("button", { name: "Create List" }));

        expect(onCreateList).toHaveBeenCalledOnce();
    });

    it("does not call onCreateList when disabled", async () => {
        const onCreateList = vi.fn();
        const { user } = render(
            <ListsHeader disabled onCreateList={onCreateList} />,
        );

        await user.click(screen.getByRole("button", { name: "Create List" }));

        expect(onCreateList).not.toHaveBeenCalled();
    });
});
