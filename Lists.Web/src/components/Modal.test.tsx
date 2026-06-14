import { describe, expect, it, vi } from "vitest";

import { render, screen, within } from "../test/render";
import Modal from "./Modal";

describe("Modal", () => {
    it("renders nothing when closed", () => {
        render(
            <Modal isOpen={false} title="Edit List">
                Modal content
            </Modal>,
        );

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders title, content, and actions", () => {
        render(
            <Modal
                actions={<button type="button">Save</button>}
                isOpen
                title="Edit List"
            >
                Modal content
            </Modal>,
        );

        const dialog = screen.getByRole("dialog", { name: "Edit List" });

        expect(
            within(dialog).getByRole("heading", { name: "Edit List" }),
        ).toBeInTheDocument();
        expect(within(dialog).getByText("Modal content")).toBeInTheDocument();
        expect(
            within(dialog).getByRole("button", { name: "Save" }),
        ).toBeInTheDocument();
    });

    it("uses an aria label when there is no title", () => {
        render(
            <Modal ariaLabel="Review access" isOpen>
                Access content
            </Modal>,
        );

        expect(
            screen.getByRole("dialog", { name: "Review access" }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "Review access" }),
        ).not.toBeInTheDocument();
    });

    it("calls onClose from the close button, backdrop, and Escape", async () => {
        const onClose = vi.fn();
        const { user } = render(
            <Modal isOpen onClose={onClose} title="Edit List">
                Modal content
            </Modal>,
        );
        const dialog = screen.getByRole("dialog", { name: "Edit List" });

        await user.click(
            within(dialog).getByRole("button", { name: "Close dialog" }),
        );

        const backdropButton = screen.getAllByRole("button", {
            name: "Close dialog",
        })[0];

        expect(backdropButton).toHaveClass("modal__backdrop");
        await user.click(backdropButton);

        dialog.focus();
        await user.keyboard("{Escape}");

        expect(onClose).toHaveBeenCalledTimes(3);
    });
});
