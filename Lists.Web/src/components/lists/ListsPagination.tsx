import type { ChangeEvent } from "react";

import type { ListsPageInfo } from "../../api/lists";
import { Button } from "../Button";

type PaginationArrowDirection = "previous" | "next";

type PaginationArrowProps = {
    direction: PaginationArrowDirection;
};

type ListsPaginationProps = {
    disabled?: boolean;
    idPrefix?: string;
    isLoading?: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageInfo?: ListsPageInfo | null;
    pageSizeOptions: readonly number[];
};

function PaginationArrow({ direction }: PaginationArrowProps) {
    const path =
        direction === "previous" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6";

    return (
        <svg
            aria-hidden="true"
            className="pagination__icon"
            focusable="false"
            viewBox="0 0 24 24"
        >
            <path d={path} />
        </svg>
    );
}

function getRangeText(pageInfo: ListsPageInfo): string {
    if (pageInfo.totalCount === 0) {
        return "Showing 0 lists";
    }

    const start = (pageInfo.page - 1) * pageInfo.pageSize + 1;
    const end = Math.min(pageInfo.page * pageInfo.pageSize, pageInfo.totalCount);
    const label = pageInfo.totalCount === 1 ? "list" : "lists";

    return `Showing ${start}-${end} of ${pageInfo.totalCount} ${label}`;
}

export default function ListsPagination({
    disabled = false,
    idPrefix = "lists-pagination",
    isLoading = false,
    onPageChange,
    onPageSizeChange,
    pageInfo,
    pageSizeOptions,
}: ListsPaginationProps) {
    if (!pageInfo) {
        return null;
    }

    const currentPage = pageInfo.page;
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < pageInfo.totalPages;
    const hasMultiplePages = pageInfo.totalPages > 1;
    const isDisabled = disabled || isLoading;
    const pageSizeId = `${idPrefix}-page-size`;

    function handlePageSizeChange(event: ChangeEvent<HTMLSelectElement>): void {
        if (isDisabled) {
            return;
        }

        onPageSizeChange(Number(event.target.value));
    }

    function handlePreviousPage(): void {
        if (isDisabled || !canGoPrevious) {
            return;
        }

        onPageChange(currentPage - 1);
    }

    function handleNextPage(): void {
        if (isDisabled || !canGoNext) {
            return;
        }

        onPageChange(currentPage + 1);
    }

    return (
        <nav className="pagination" aria-label="lists pagination">
            <p className="pagination__summary">
                {getRangeText(pageInfo)}
            </p>

            <label className="pagination__page-size" htmlFor={pageSizeId}>
                <span>Per page</span>
                <select
                    disabled={isDisabled}
                    id={pageSizeId}
                    name={pageSizeId}
                    onChange={handlePageSizeChange}
                    value={pageInfo.pageSize}
                >
                    {pageSizeOptions.map((pageSize) => (
                        <option key={pageSize} value={pageSize}>
                            {pageSize}
                        </option>
                    ))}
                </select>
            </label>

            {hasMultiplePages && (
                <div className="pagination__controls">
                    <Button
                        aria-label="Previous page"
                        className="pagination__button"
                        disabled={isDisabled || !canGoPrevious}
                        onClick={handlePreviousPage}
                    >
                        <PaginationArrow direction="previous" />
                    </Button>

                    <Button
                        aria-label="Next page"
                        className="pagination__button"
                        disabled={isDisabled || !canGoNext}
                        onClick={handleNextPage}
                    >
                        <PaginationArrow direction="next" />
                    </Button>
                </div>
            )}
        </nav>
    );
}
