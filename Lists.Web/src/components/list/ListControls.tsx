import type { ChangeEvent, SubmitEvent } from "react";

import type {
    ItemSort,
    ItemStatus,
    SortDirection,
} from "../../pages/list/listPageConfig";
import { Button } from "../Button";
import { getAmountSortLabel } from "./amountLabels";

type ListControlsProps = {
    bulkActionsDisabled?: boolean;
    disabled?: boolean;
    hasCompletedItems?: boolean;
    hasIncompleteItems?: boolean;
    idPrefix?: string;
    isFiltered?: boolean;
    unitLabel?: string | null;
    onSearchChange?: (value: string) => void;
    onStatusChange?: (value: ItemStatus) => void;
    onSortByChange?: (value: ItemSort) => void;
    onSortDirectionChange?: (value: SortDirection) => void;
    onMarkAllItemsComplete?: () => void;
    onMarkAllItemsIncomplete?: () => void;
    search?: string;
    status?: ItemStatus;
    sortBy?: ItemSort;
    sortDirection?: SortDirection;
};

export default function ListControls({
    bulkActionsDisabled = false,
    disabled = false,
    hasCompletedItems = false,
    hasIncompleteItems = false,
    idPrefix = "list",
    isFiltered = false,
    unitLabel,
    onSearchChange = () => {},
    onStatusChange = () => {},
    onSortByChange = () => {},
    onSortDirectionChange = () => {},
    onMarkAllItemsComplete = () => {},
    onMarkAllItemsIncomplete = () => {},
    search = "",
    status = "all",
    sortBy = "name",
    sortDirection = "asc",
}: ListControlsProps) {
    const searchId = `${idPrefix}-search`;
    const statusId = `${idPrefix}-status`;
    const sortById = `${idPrefix}-sort-by`;
    const sortDirectionId = `${idPrefix}-sort-direction`;
    const amountSortLabel = getAmountSortLabel(unitLabel);
    const tickButtonLabel = isFiltered
        ? "Tick Filtered Entries"
        : "Tick All Entries";
    const untickButtonLabel = isFiltered
        ? "Untick Filtered Entries"
        : "Untick All Entries";
    const areBulkActionsDisabled = disabled || bulkActionsDisabled;
    const hasBulkActions = hasIncompleteItems || hasCompletedItems;

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
        if (disabled) {
            return;
        }

        onSearchChange(event.target.value);
    }

    function handleStatusChange(event: ChangeEvent<HTMLSelectElement>): void {
        if (disabled) {
            return;
        }

        onStatusChange(event.target.value as ItemStatus);
    }

    function handleSortByChange(event: ChangeEvent<HTMLSelectElement>): void {
        if (disabled) {
            return;
        }

        onSortByChange(event.target.value as ItemSort);
    }

    function handleSortDirectionChange(
        event: ChangeEvent<HTMLSelectElement>,
    ): void {
        if (disabled) {
            return;
        }

        onSortDirectionChange(event.target.value as SortDirection);
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
        event.preventDefault();
    }

    return (
        <div className="controls">
            <form
                className="controls-form controls-form--items"
                onSubmit={handleSubmit}
            >
                <label
                    className="controls__field controls__field--search"
                    htmlFor={searchId}
                >
                    <span>Search</span>
                    <input
                        disabled={disabled}
                        id={searchId}
                        name={searchId}
                        onChange={handleSearchChange}
                        placeholder="Search entries"
                        type="search"
                        value={search}
                    />
                </label>

                <label
                    className="controls__field controls__field--status"
                    htmlFor={statusId}
                >
                    <span>Filter by</span>
                    <select
                        disabled={disabled}
                        id={statusId}
                        name={statusId}
                        onChange={handleStatusChange}
                        value={status}
                    >
                        <option value="all">All</option>
                        <option value="completed">Completed</option>
                        <option value="active">Active</option>
                    </select>
                </label>

                <label
                    className="controls__field controls__field--sort"
                    htmlFor={sortById}
                >
                    <span>Sort by</span>
                    <select
                        disabled={disabled}
                        id={sortById}
                        name={sortById}
                        onChange={handleSortByChange}
                        value={sortBy}
                    >
                        <option value="name">Name</option>
                        <option value="amount">{amountSortLabel}</option>
                        <option value="status">Status</option>
                    </select>
                </label>

                <label
                    className="controls__field controls__field--direction"
                    htmlFor={sortDirectionId}
                >
                    <span>Sort direction</span>
                    <select
                        disabled={disabled}
                        id={sortDirectionId}
                        name={sortDirectionId}
                        onChange={handleSortDirectionChange}
                        value={sortDirection}
                    >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </label>

                {hasBulkActions && (
                    <div className="controls__bulk-actions">
                        {hasIncompleteItems && (
                            <Button
                                disabled={areBulkActionsDisabled}
                                type="button"
                                onClick={onMarkAllItemsComplete}
                            >
                                {tickButtonLabel}
                            </Button>
                        )}
                        {hasCompletedItems && (
                            <Button
                                disabled={areBulkActionsDisabled}
                                type="button"
                                onClick={onMarkAllItemsIncomplete}
                            >
                                {untickButtonLabel}
                            </Button>
                        )}
                    </div>
                )}
            </form>
        </div>
    );
}
