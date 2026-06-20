import { Link } from "react-router";

import type { ListSummary } from "../../api/lists";
import {
    canDeleteList,
    canUpdateList,
    canViewListAccess,
    isListOwner,
} from "../../access/permissions";
import { Button } from "../Button";

type ListCardProps = {
    disabled?: boolean;
    list: ListSummary;
    onEditList?: (list: ListSummary) => void;
    onReviewAccess?: (list: ListSummary) => void;
    onDeleteList?: (list: ListSummary) => void;
};

export default function ListCard({
    disabled = false,
    list,
    onEditList = () => {},
    onReviewAccess = () => {},
    onDeleteList = () => {},
}: ListCardProps) {
    const canEdit = canUpdateList(list.currentUserRole);
    const canReviewAccess = canViewListAccess(list.currentUserRole);
    const canDelete = canDeleteList(list.currentUserRole);
    const ownsList = isListOwner(list.currentUserRole);

    return (
        <article
            className={`card list-card${disabled ? "" : " list-card--link"}`}
        >
            {!disabled && (
                <Link
                    aria-label={`Open ${list.name}`}
                    className="list-card__link"
                    to={`/lists/${list.id}`}
                />
            )}

            <h2 className="list-card__name">{list.name}</h2>

            <div className="list-card__details">
                <p>
                    {list.completedItemCount} of {list.itemCount} completed
                </p>

                <p>Units: {list.unitLabel ?? "none"}</p>

                {ownsList ? (
                    <p>You own this list</p>
                ) : (
                    <>
                        <p>Owner: {list.ownerUsername}</p>
                        <p>Role: {list.currentUserRole}</p>
                    </>
                )}
            </div>

            <div className="list-card__actions">
                {canReviewAccess && (
                    <Button
                        aria-label={`Review access to ${list.name}`}
                        className="list-card__action list-card__action--review-access"
                        disabled={disabled}
                        onClick={() => onReviewAccess(list)}
                        variant="reviewAccess"
                    >
                        Review access
                    </Button>
                )}

                {canEdit && (
                    <Button
                        aria-label={`Edit ${list.name}`}
                        className="list-card__action list-card__action--edit"
                        disabled={disabled}
                        onClick={() => onEditList(list)}
                        variant="edit"
                    >
                        Edit
                    </Button>
                )}

                {canDelete && (
                    <Button
                        aria-label={`Delete ${list.name}`}
                        className="list-card__action"
                        disabled={disabled}
                        onClick={() => onDeleteList(list)}
                        variant="danger"
                    >
                        Delete
                    </Button>
                )}
            </div>
        </article>
    );
}
