import type { ListSummary } from "../../api/lists";
import ListCard from "./ListCard";

type ListsGridProps = {
    disabled?: boolean;
    emptyMessage: string | null;
    hasLoadedLists?: boolean;
    isLoading?: boolean;
    lists: ListSummary[];
    onEditList: (list: ListSummary) => void;
    onReviewAccess: (list: ListSummary) => void;
    onDeleteList: (list: ListSummary) => void;
};

export default function ListsGrid({
    disabled = false,
    emptyMessage,
    hasLoadedLists = true,
    isLoading = false,
    lists,
    onEditList,
    onReviewAccess,
    onDeleteList,
}: ListsGridProps) {
    const hasLists = lists.length > 0;

    if (isLoading) {
        return <p>Loading lists...</p>;
    }

    if (!hasLoadedLists) {
        return null;
    }

    if (!hasLists && !emptyMessage) {
        return null;
    }

    return (
        <div>
            {hasLists ? (
                <div className="lists__grid">
                    {lists.map((list) => (
                        <ListCard
                            disabled={disabled}
                            key={list.id}
                            list={list}
                            onDeleteList={onDeleteList}
                            onEditList={onEditList}
                            onReviewAccess={onReviewAccess}
                        />
                    ))}
                </div>
            ) : (
                <p>{emptyMessage}</p>
            )}
        </div>
    );
}
