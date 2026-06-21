import type { ListItem } from "../../../api/lists";
import ListControls from "../../list/ListControls";
import ListHeader from "../../list/ListHeader";
import ListItems from "../../list/ListItems";
import ListTotal from "../../list/ListTotal";

const previewItems: ListItem[] = [
    {
        id: 7,
        name: "Coffee Beans",
        amount: 12.5,
        isCompleted: false,
        version: 1,
    },
    {
        id: 9,
        name: "Debugging Snacks",
        amount: 6.9,
        isCompleted: false,
        version: 1,
    },
    {
        id: 1,
        name: "Printer Paper",
        amount: 8.4,
        isCompleted: false,
        version: 1,
    },
    {
        id: 12,
        name: "Whiteboard Markers",
        amount: 9.8,
        isCompleted: false,
        version: 1,
    },
];

const previewListName = "Weekly Shop";
const previewUnitLabel = "$";
const previewTotalAmount = previewItems.reduce(
    (totalAmount, item) => totalAmount + item.amount,
    0,
);
const hasIncompletePreviewItems = previewItems.some(
    (item) => !item.isCompleted,
);
const hasCompletedPreviewItems = previewItems.some(
    (item) => item.isCompleted,
);

function handlePreviewAction(): void {}

export default function ListPreview() {
    return (
        <section
            className="home__previews-container"
            aria-label="List page preview"
        >
            <ListHeader
                disabled
                listName={previewListName}
                onAddItem={handlePreviewAction}
            />

            <ListControls
                disabled
                hasCompletedItems={hasCompletedPreviewItems}
                hasIncompleteItems={hasIncompletePreviewItems}
                idPrefix="list-preview"
                onSearchChange={handlePreviewAction}
                onStatusChange={handlePreviewAction}
                onSortByChange={handlePreviewAction}
                onSortDirectionChange={handlePreviewAction}
                onMarkAllItemsComplete={handlePreviewAction}
                onMarkAllItemsIncomplete={handlePreviewAction}
                unitLabel={previewUnitLabel}
            />

            <ListItems
                disabled
                emptyMessage="No entries yet"
                errorItemId={null}
                itemError=""
                items={previewItems}
                listName={previewListName}
                onDeleteItem={handlePreviewAction}
                onEditItem={handlePreviewAction}
                onItemCompletedChange={handlePreviewAction}
                onReloadItemError={handlePreviewAction}
                unitLabel={previewUnitLabel}
            />

            <ListTotal
                totalAmount={previewTotalAmount}
                unitLabel={previewUnitLabel}
            />
        </section>
    );
}
