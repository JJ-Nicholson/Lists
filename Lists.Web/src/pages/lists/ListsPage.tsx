import { useState } from "react";

import type { ListSummary } from "../../api/lists";
import { Button } from "../../components/Button";
import CreateListModal from "../../components/lists/CreateListModal";
import DeleteListModal from "../../components/lists/DeleteListModal";
import EditListModal from "../../components/lists/EditListModal";
import ListsControls from "../../components/lists/ListsControls";
import ListsGrid from "../../components/lists/ListsGrid";
import ListsHeader from "../../components/lists/ListsHeader";
import ListsPagination from "../../components/lists/ListsPagination";
import ReviewListAccessModal from "../../components/lists/ReviewListAccessModal";
import { LISTS_PAGE_SIZE_OPTIONS } from "./listsPageConfig";
import { useListsPageData } from "./useListsPageData";
import { useListsSearchParams } from "./useListsSearchParams";

type ActiveListDialog =
    | { type: "access"; list: ListSummary }
    | { type: "edit"; list: ListSummary }
    | { type: "delete"; list: ListSummary };

type ReloadableListDialogType = ActiveListDialog["type"];

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
        updateListsSearchParams,
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
        updateListsSearchParams,
    });
    const listsEmptyMessage =
        isLoading || error || searchInput !== search
            ? null
            : search.trim()
              ? "No matching lists"
              : "No lists here!";
    const listActionsDisabled =
        isLoading || Boolean(error) || searchInput !== search;

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

    async function reloadListDialog(
        dialogType: ReloadableListDialogType,
        listId: number,
    ): Promise<boolean> {
        const refreshedListsPage = await refreshListsPage();

        if (!refreshedListsPage) {
            throw new Error("Could not reload lists.");
        }

        if (dialogType === "delete") {
            setActiveListDialog(null);
            return false;
        }

        const refreshedList = refreshedListsPage.lists.find(
            (list) => list.id === listId,
        );

        if (!refreshedList) {
            setActiveListDialog(null);
            return false;
        }

        switch (dialogType) {
            case "access":
                setActiveListDialog({ type: "access", list: refreshedList });
                break;
            case "edit":
                setActiveListDialog({ type: "edit", list: refreshedList });
                break;
        }

        return true;
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

            {error && (
                <div className="page-error">
                    <p className="page-error__message" role="alert">{error}</p>
                    <Button disabled={isLoading} onClick={refreshListsPage}>
                        Reload Lists
                    </Button>
                </div>
            )}

            <ListsGrid
                disabled={listActionsDisabled}
                emptyMessage={listsEmptyMessage}
                hasLoadedLists={hasLoadedLists}
                isLoading={isLoading && !hasLoadedLists}
                lists={lists}
                onDeleteList={openDeleteModal}
                onEditList={openEditModal}
                onReviewAccess={openReviewAccessModal}
            />

            <ListsPagination
                disabled={listActionsDisabled}
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
                    onReloadList={(list) =>
                        reloadListDialog("access", list.id)
                    }
                />
            )}

            {activeListDialog?.type === "edit" && (
                <EditListModal
                    key={`edit-${activeListDialog.list.id}-${activeListDialog.list.version}`}
                    list={activeListDialog.list}
                    onClose={closeActiveListDialog}
                    onListUpdated={refreshListsPage}
                    onReloadList={(list) => reloadListDialog("edit", list.id)}
                />
            )}

            {activeListDialog?.type === "delete" && (
                <DeleteListModal
                    list={activeListDialog.list}
                    onClose={closeActiveListDialog}
                    onListDeleted={refreshListsPage}
                    onReloadList={() =>
                        reloadListDialog("delete", activeListDialog.list.id)
                    }
                />
            )}
        </>
    );
}
