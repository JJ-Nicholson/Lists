import { describe, expect, it, vi } from "vitest";

import type { ListsPageInfo } from "../../api/lists";
import { LISTS_PAGE_SIZE_OPTIONS } from "../../pages/lists/listsPageConfig";
import { render, screen } from "../../test/render";
import ListsPagination from "./ListsPagination";

function createPageInfo(overrides: Partial<ListsPageInfo> = {}): ListsPageInfo {
    return {
        page: 1,
        pageSize: 12,
        totalCount: 20,
        totalPages: 2,
        ...overrides,
    };
}

function renderListsPagination(pageInfo?: ListsPageInfo | null) {
    return render(
        <ListsPagination
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            pageInfo={pageInfo}
            pageSizeOptions={LISTS_PAGE_SIZE_OPTIONS}
        />,
    );
}

describe("ListsPagination", () => {
    it("renders nothing without page info", () => {
        const { container } = renderListsPagination(undefined);

        expect(container).toBeEmptyDOMElement();
    });

    it("shows the empty range text", () => {
        renderListsPagination(
            createPageInfo({
                totalCount: 0,
                totalPages: 0,
            }),
        );

        expect(screen.getByText("Showing 0 lists")).toBeInTheDocument();
    });

    it("shows the current range text", () => {
        renderListsPagination(
            createPageInfo({
                page: 2,
                pageSize: 12,
                totalCount: 20,
                totalPages: 2,
            }),
        );

        expect(screen.getByText("Showing 13-20 of 20 lists")).toBeInTheDocument();
    });

    it("uses the singular list label for one result", () => {
        renderListsPagination(
            createPageInfo({
                totalCount: 1,
                totalPages: 1,
            }),
        );

        expect(screen.getByText("Showing 1-1 of 1 list")).toBeInTheDocument();
    });

    it("calls onPageChange when changing pages", async () => {
        const onPageChange = vi.fn();
        const { user } = render(
            <ListsPagination
                onPageChange={onPageChange}
                onPageSizeChange={() => {}}
                pageInfo={createPageInfo({
                    page: 2,
                    totalPages: 3,
                })}
                pageSizeOptions={LISTS_PAGE_SIZE_OPTIONS}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Previous page" }));
        await user.click(screen.getByRole("button", { name: "Next page" }));

        expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
        expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
    });

    it("disables previous and next buttons at page boundaries", () => {
        renderListsPagination(createPageInfo());

        expect(
            screen.getByRole("button", { name: "Previous page" }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Next page" }),
        ).not.toBeDisabled();
    });

    it("calls onPageSizeChange when changing page size", async () => {
        const onPageSizeChange = vi.fn();
        const { user } = render(
            <ListsPagination
                onPageChange={() => {}}
                onPageSizeChange={onPageSizeChange}
                pageInfo={createPageInfo()}
                pageSizeOptions={LISTS_PAGE_SIZE_OPTIONS}
            />,
        );

        await user.selectOptions(screen.getByLabelText("Per page"), "24");

        expect(onPageSizeChange).toHaveBeenCalledWith(24);
    });

    it("disables controls while loading", async () => {
        const onPageChange = vi.fn();
        const onPageSizeChange = vi.fn();
        const { user } = render(
            <ListsPagination
                isLoading
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                pageInfo={createPageInfo()}
                pageSizeOptions={LISTS_PAGE_SIZE_OPTIONS}
            />,
        );

        expect(screen.getByLabelText("Per page")).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Next page" }));

        expect(onPageChange).not.toHaveBeenCalled();
        expect(onPageSizeChange).not.toHaveBeenCalled();
    });
});
