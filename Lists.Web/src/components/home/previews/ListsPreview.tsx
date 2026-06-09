import type { ListsPageInfo, ListSummary } from "../../../api/lists";
import { LISTS_PAGE_SIZE_OPTIONS } from "../../../pages/lists/listsPageConfig";
import ListsControls from "../../lists/ListsControls";
import ListsGrid from "../../lists/ListsGrid";
import ListsHeader from "../../lists/ListsHeader";
import ListsPagination from "../../lists/ListsPagination";

const previewLists: ListSummary[] = [
    {
        id: 4,
        name: "Camping Prep",
        unitLabel: "items",
        version: 1,
        completedItemCount: 3,
        itemCount: 7,
        ownerUsername: "Bertrand Russell",
        currentUserRole: "editor",
    },
    {
        id: 3,
        name: "Hardware Run",
        unitLabel: "NZD",
        version: 1,
        completedItemCount: 1,
        itemCount: 5,
        ownerUsername: "Johnny von Neumann",
        currentUserRole: "editor",
    },
    {
        id: 1,
        name: "To-Do List",
        unitLabel: null,
        version: 1,
        completedItemCount: 8,
        itemCount: 12,
        ownerUsername: "You",
        currentUserRole: "owner",
    },
    {
        id: 2,
        name: "Weekly Shop",
        unitLabel: "NZD",
        version: 1,
        completedItemCount: 0,
        itemCount: 4,
        ownerUsername: "Grace Hopper",
        currentUserRole: "editor",
    },
];

const previewPageInfo: ListsPageInfo = {
    page: 1,
    pageSize: 6,
    totalCount: previewLists.length,
    totalPages: 1,
};

function handlePreviewAction(): void {}

export default function ListsPreview() {
    return (
        <section
            className="home__previews-container"
            aria-label="Lists page preview"
        >
            <ListsHeader disabled onCreateList={handlePreviewAction} />

            <ListsControls
                disabled
                idPrefix="lists-preview"
                onSearchChange={handlePreviewAction}
                onSortDirectionChange={handlePreviewAction}
            />

            <ListsGrid
                disabled
                lists={previewLists}
                onDeleteList={handlePreviewAction}
                onEditList={handlePreviewAction}
                onReviewAccess={handlePreviewAction}
            />

            <ListsPagination
                disabled
                idPrefix="lists-preview-pagination"
                onPageChange={handlePreviewAction}
                onPageSizeChange={handlePreviewAction}
                pageInfo={previewPageInfo}
                pageSizeOptions={LISTS_PAGE_SIZE_OPTIONS}
            />
        </section>
    );
}
