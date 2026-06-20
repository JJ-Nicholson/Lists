import type { ListItem } from "../../api/lists";
import ListItemRow from "./ListItemRow";

type ListItemsProps = {
    disabled?: boolean;
    emptyMessage: string | null;
    items: ListItem[];
    listName: string;
    unitLabel?: string | null;
    onDeleteItem: (item: ListItem) => void;
    onEditItem: (item: ListItem) => void;
    onItemCompletedChange: (itemId: number) => void;
};

export default function ListItems({
    disabled = false,
    emptyMessage,
    items,
    listName,
    unitLabel,
    onDeleteItem,
    onEditItem,
    onItemCompletedChange,
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
                    disabled={disabled}
                    item={item}
                    key={item.id}
                    unitLabel={unitLabel}
                    onCompletedChange={onItemCompletedChange}
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                />
            ))}
        </section>
    );
}
