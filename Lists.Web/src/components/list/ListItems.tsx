import type { ListItem } from "../../api/lists";
import ListItemRow from "./ListItemRow";

type ListItemsProps = {
    disabled: boolean;
    emptyMessage: string | null;
    errorItemId: number | null;
    itemError: string;
    items: ListItem[];
    listName: string;
    unitLabel?: string | null;
    onDeleteItem: (item: ListItem) => void;
    onEditItem: (item: ListItem) => void;
    onItemCompletedChange: (itemId: number) => void;
    onReloadItemError: () => void;
};

export default function ListItems({
    disabled,
    emptyMessage,
    errorItemId,
    itemError,
    items,
    listName,
    unitLabel,
    onDeleteItem,
    onEditItem,
    onItemCompletedChange,
    onReloadItemError,
}: ListItemsProps) {
    const hasItems = items.length > 0;

    if (!hasItems) {
        return emptyMessage ? (
            <section className="list-items" aria-label={`${listName} entries`}>
                <p>{emptyMessage}</p>
            </section>
        ) : null;
    }

    return (
        <section className="list-items" aria-label={`${listName} entries`}>
            {items.map((item) => (
                <ListItemRow
                    disabled={disabled || item.id === errorItemId}
                    error={item.id === errorItemId ? itemError : ""}
                    item={item}
                    key={item.id}
                    unitLabel={unitLabel}
                    onCompletedChange={onItemCompletedChange}
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                    onReloadError={onReloadItemError}
                />
            ))}
        </section>
    );
}
