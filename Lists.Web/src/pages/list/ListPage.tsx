import { useEffect, useState } from "react";
import { useParams } from "react-router";

import type { ListDetails, ListItem } from "../../api/lists";
import { Button } from "../../components/Button";
import CreateItemModal from "../../components/list/CreateItemModal";
import DeleteItemModal from "../../components/list/DeleteItemModal";
import EditItemModal from "../../components/list/EditItemModal";
import ListControls from "../../components/list/ListControls";
import ListHeader from "../../components/list/ListHeader";
import ListItems from "../../components/list/ListItems";
import ListTotal from "../../components/list/ListTotal";
import NotFoundPage from "../NotFoundPage";
import { useListItemMutations } from "./useListItemMutations";
import { useListPageData } from "./useListPageData";
import { useListSearchParams } from "./useListSearchParams";

type ActiveItemDialog =
    | { type: "edit"; item: ListItem }
    | { type: "delete"; item: ListItem };

type ListPageContentProps = {
    listId: string;
};

export default function ListPage() {
    const { listId } = useParams();

    if (!listId) {
        return <p>No list ID was provided.</p>;
    }

    return <ListPageContent key={listId} listId={listId} />;
}

function ListPageContent({ listId }: ListPageContentProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isListActionNotFound, setIsListActionNotFound] = useState(false);
    const [activeItemDialog, setActiveItemDialog] =
        useState<ActiveItemDialog | null>(null);

    const {
        search,
        searchInput,
        status,
        sortBy,
        sortDirection,
        handleSortByChange,
        handleSearchChange,
        handleStatusChange,
        handleSortDirectionChange,
    } = useListSearchParams();

    const {
        error,
        isListNotFound,
        isLoading,
        items,
        list,
        refreshListPage,
        totalAmount,
    } = useListPageData({
        listId,
        search,
        status,
        sortBy,
        sortDirection,
    });

    const {
        clearMutationError,
        isMutatingItems,
        mutationError,
        handleItemCompletedChange,
        handleMarkAllItemsComplete,
        handleMarkAllItemsIncomplete,
    } = useListItemMutations({
        items,
        listId,
        onListNotFound: () => setIsListActionNotFound(true),
        refreshListPage,
    });

    const isFiltered = status !== "all" || search.trim().length > 0;
    const hasIncompleteItems = items.some((item) => !item.isCompleted);
    const hasCompletedItems = items.some((item) => item.isCompleted);
    const pageError = mutationError || error;
    const itemsEmptyMessage =
        isLoading || pageError || searchInput !== search
            ? null
            : isFiltered
              ? "No matching entries"
              : "No entries yet";
    const itemActionsDisabled =
        isMutatingItems ||
        isLoading ||
        searchInput !== search;
    const bulkActionsDisabled = itemActionsDisabled || Boolean(pageError);

    useEffect(() => {
        clearMutationError();
    }, [clearMutationError, listId, search, status, sortBy, sortDirection]);

    function openCreateModal(): void {
        setIsCreateOpen(true);
    }

    function closeCreateModal(): void {
        setIsCreateOpen(false);
    }

    function openEditModal(item: ListItem): void {
        setActiveItemDialog({ type: "edit", item });
    }

    function openDeleteModal(item: ListItem): void {
        setActiveItemDialog({ type: "delete", item });
    }

    function closeActiveItemDialog(): void {
        setActiveItemDialog(null);
    }

    async function reloadListPage(): Promise<ListDetails | null> {
        clearMutationError();
        return refreshListPage();
    }

    async function reloadItemDialog(
        dialogType: ActiveItemDialog["type"],
        itemId: number,
    ): Promise<void> {
        const refreshedList = await reloadListPage();

        if (!refreshedList) {
            throw new Error("Could not reload list.");
        }

        if (dialogType === "delete") {
            setActiveItemDialog(null);
            return;
        }

        const refreshedItem = refreshedList.items.find(
            (item) => item.id === itemId,
        );

        if (!refreshedItem) {
            setActiveItemDialog(null);
            return;
        }

        setActiveItemDialog({ type: dialogType, item: refreshedItem });
    }

    if (isListNotFound || isListActionNotFound) {
        return <NotFoundPage />;
    }

    if (isLoading && !list) {
        return <p>Loading...</p>;
    }

    if (error && !list) {
        return <p>{error}</p>;
    }

    if (!list) {
        return <p>No list was found.</p>;
    }

    return (
        <>
            <ListHeader
                addItemDisabled={itemActionsDisabled}
                disabled={isMutatingItems}
                listName={list.name}
                onAddItem={openCreateModal}
            />
            <ListControls
                bulkActionsDisabled={bulkActionsDisabled}
                disabled={isMutatingItems}
                hasCompletedItems={hasCompletedItems}
                hasIncompleteItems={hasIncompleteItems}
                isFiltered={isFiltered}
                onSearchChange={handleSearchChange}
                onStatusChange={handleStatusChange}
                onSortByChange={handleSortByChange}
                onSortDirectionChange={handleSortDirectionChange}
                onMarkAllItemsComplete={handleMarkAllItemsComplete}
                onMarkAllItemsIncomplete={handleMarkAllItemsIncomplete}
                search={searchInput}
                status={status}
                sortBy={sortBy}
                sortDirection={sortDirection}
                unitLabel={list.unitLabel}
            />
            {pageError && (
                <div className="page-error">
                    <p className="page-error__message" role="alert">
                        {pageError}
                    </p>
                    <Button
                        disabled={isLoading || isMutatingItems}
                        onClick={reloadListPage}
                    >
                        Reload List
                    </Button>
                </div>
            )}
            {isLoading && <p>Loading...</p>}

            <ListItems
                disabled={itemActionsDisabled}
                emptyMessage={itemsEmptyMessage}
                items={items}
                listName={list.name}
                unitLabel={list.unitLabel}
                onItemCompletedChange={handleItemCompletedChange}
                onEditItem={openEditModal}
                onDeleteItem={openDeleteModal}
            />

            {items.length > 0 && (
                <ListTotal
                    isFiltered={isFiltered}
                    totalAmount={totalAmount}
                    unitLabel={list.unitLabel}
                />
            )}

            {isCreateOpen && (
                <CreateItemModal
                    listId={listId}
                    unitLabel={list.unitLabel}
                    onClose={closeCreateModal}
                    onItemCreated={reloadListPage}
                    onListNotFound={() => setIsListActionNotFound(true)}
                />
            )}

            {activeItemDialog?.type === "edit" && (
                <EditItemModal
                    key={`edit-${activeItemDialog.item.id}-${activeItemDialog.item.version}`}
                    item={activeItemDialog.item}
                    listId={listId}
                    unitLabel={list.unitLabel}
                    onClose={closeActiveItemDialog}
                    onItemUpdated={reloadListPage}
                    onListNotFound={() => setIsListActionNotFound(true)}
                    onReloadItem={(item) => reloadItemDialog("edit", item.id)}
                />
            )}

            {activeItemDialog?.type === "delete" && (
                <DeleteItemModal
                    item={activeItemDialog.item}
                    listId={listId}
                    onClose={closeActiveItemDialog}
                    onItemDeleted={reloadListPage}
                    onListNotFound={() => setIsListActionNotFound(true)}
                    onReloadItem={() =>
                        reloadItemDialog("delete", activeItemDialog.item.id)
                    }
                />
            )}
        </>
    );
}
