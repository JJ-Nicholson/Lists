import type { ListItem } from "../../api/lists";
import { Button } from "../Button";
import { formatListAmount } from "./amountFormat";

type ListItemRowProps = {
    disabled: boolean;
    error: string;
    item: ListItem;
    unitLabel?: string | null;
    onCompletedChange: (itemId: number) => void;
    onEditItem: (item: ListItem) => void;
    onDeleteItem: (item: ListItem) => void;
    onReloadError: () => void;
};

export default function ListItemRow({
    disabled,
    error,
    item,
    unitLabel,
    onCompletedChange,
    onEditItem,
    onDeleteItem,
    onReloadError,
}: ListItemRowProps) {
    const isCompleted = item.isCompleted;

    return (
        <article
            className={`list-item-row${
                isCompleted ? " list-item-row--completed" : ""
            }${error ? " list-item-row--error" : ""}`}
        >
            <label className="list-item-row__checkbox">
                <span className="visually-hidden">
                    Mark {item.name} as{" "}
                    {isCompleted ? "not completed" : "completed"}
                </span>
                <input
                    checked={isCompleted}
                    disabled={disabled}
                    onChange={() => onCompletedChange(item.id)}
                    type="checkbox"
                />
            </label>

            <p className="list-item-row__name">{item.name}</p>
            <p className="list-item-row__amount">
                {formatListAmount(item.amount, unitLabel)}
            </p>

            <div className="list-item-row__actions">
                <Button
                    aria-label={`Edit ${item.name}`}
                    disabled={disabled}
                    onClick={() => onEditItem(item)}
                    variant="edit"
                >
                    Edit
                </Button>
                <Button
                    aria-label={`Delete ${item.name}`}
                    disabled={disabled}
                    onClick={() => onDeleteItem(item)}
                    variant="danger"
                >
                    Delete
                </Button>
            </div>

            {error && (
                <div className="list-item-row__error">
                    <p className="list-item-row__error-message" role="alert">
                        {error}
                    </p>
                    <Button onClick={onReloadError}>Reload List</Button>
                </div>
            )}
        </article>
    );
}
