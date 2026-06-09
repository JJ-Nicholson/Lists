import type { ChangeEvent, SubmitEvent } from "react";

type SortDirection = "asc" | "desc";

type ListsControlsProps = {
    disabled?: boolean;
    idPrefix?: string;
    onSearchChange?: (value: string) => void;
    onSortDirectionChange?: (value: SortDirection) => void;
    search?: string;
    sortDirection?: SortDirection;
};

export default function ListsControls({
    disabled = false,
    idPrefix = "lists",
    onSearchChange = () => {},
    onSortDirectionChange = () => {},
    search = "",
    sortDirection = "asc",
}: ListsControlsProps) {
    const searchId = `${idPrefix}-search`;
    const sortDirectionId = `${idPrefix}-sort-direction`;

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
        if (disabled) {
            return;
        }

        onSearchChange(event.target.value);
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
                className="controls-form controls-form--lists"
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
                        placeholder="Search lists"
                        type="search"
                        value={search}
                    />
                </label>

                <label
                    className="controls__field controls__field--direction"
                    htmlFor={sortDirectionId}
                >
                    <span>Sort alphabetically</span>
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
            </form>
        </div>
    );
}
