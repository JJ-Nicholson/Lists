import { useState } from "react";

import type { ListSummary } from "../api/lists";
import CreateListModal from "../components/lists/CreateListModal";
import DeleteListModal from "../components/lists/DeleteListModal";
import EditListModal from "../components/lists/EditListModal";
import ListsControls from "../components/lists/ListsControls";
import ListsGrid from "../components/lists/ListsGrid";
import ListsHeader from "../components/lists/ListsHeader";
import ListsPagination from "../components/lists/ListsPagination";
import ReviewListAccessModal from "../components/lists/ReviewListAccessModal";
import { LISTS_PAGE_SIZE_OPTIONS } from "./lists/listsPageConfig";
import { useListsPageData } from "./lists/useListsPageData";
import { useListsSearchParams } from "./lists/useListsSearchParams";

type ActiveListDialog =
    | { type: "access"; list: ListSummary }
    | { type: "edit"; list: ListSummary }
    | { type: "delete"; list: ListSummary };

export default function ListsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeListDialog, setActiveListDialog] =
        useState<ActiveListDialog | null>(null);

    const {
        page,
        pageSize,
        search,
        searchInput,
        sortDirection,
        updateListSearchParams,
        handlePageChange,
        handlePageSizeChange,
        handleSearchChange,
        handleSortDirectionChange,
    } = useListsSearchParams();

    const {
        error,
        hasLoadedLists,
        isLoading,
        lists,
        pageInfo,
        refreshListsPage,
    } = useListsPageData({
        page,
        pageSize,
        search,
        sortDirection,
        updateListSearchParams,
    });

    function openCreateModal(): void {
        setIsCreateOpen(true);
    }

    function closeCreateModal(): void {
        setIsCreateOpen(false);
    }

    function openReviewAccessModal(list: ListSummary): void {
        setActiveListDialog({ type: "access", list });
    }

    function openEditModal(list: ListSummary): void {
        setActiveListDialog({ type: "edit", list });
    }

    function openDeleteModal(list: ListSummary): void {
        setActiveListDialog({ type: "delete", list });
    }

    function closeActiveListDialog(): void {
        setActiveListDialog(null);
    }

    return (
        <>
            <ListsHeader onCreateList={openCreateModal} />
            
            <ListsControls
                onSearchChange={handleSearchChange}
                onSortDirectionChange={handleSortDirectionChange}
                search={searchInput}
                sortDirection={sortDirection}
            />
            
            {error && <p role="alert">{error}</p>}

            <ListsGrid
                hasLoadedLists={hasLoadedLists}
                isLoading={isLoading && !hasLoadedLists}
                lists={lists}
                onDeleteList={openDeleteModal}
                onEditList={openEditModal}
                onReviewAccess={openReviewAccessModal}
            />

            <ListsPagination
                isLoading={isLoading}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                pageInfo={pageInfo}
                pageSizeOptions={LISTS_PAGE_SIZE_OPTIONS}
            />

            {isCreateOpen && (
                <CreateListModal
                    onClose={closeCreateModal}
                    onListCreated={refreshListsPage}
                />
            )}

            {activeListDialog?.type === "access" && (
                <ReviewListAccessModal
                    list={activeListDialog.list}
                    onClose={closeActiveListDialog}
                />
            )}

            {activeListDialog?.type === "edit" && (
                <EditListModal
                    list={activeListDialog.list}
                    onClose={closeActiveListDialog}
                    onListUpdated={refreshListsPage}
                />
            )}

            {activeListDialog?.type === "delete" && (
                <DeleteListModal
                    list={activeListDialog.list}
                    onClose={closeActiveListDialog}
                    onListDeleted={refreshListsPage}
                />
            )}
        </>
    );
}
