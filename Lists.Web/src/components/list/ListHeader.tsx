import { Button, ButtonLink } from "../Button";

type ListHeaderProps = {
    addItemDisabled?: boolean;
    disabled: boolean;
    listName: string;
    onAddItem: () => void;
};

export default function ListHeader({
    addItemDisabled = false,
    disabled,
    listName,
    onAddItem,
}: ListHeaderProps) {
    const isAddItemDisabled = disabled || addItemDisabled;

    return (
        <div className="page__header">
            <p className="eyebrow">Let's Plan!</p>

            <div className="page__header-row">
                <h1 className="heading heading--small list__name">{listName}</h1>
                <div className="list-header__actions">
                    {disabled ? (
                        <Button
                            className="list-header__back-button"
                            disabled
                            variant="disabled"
                        >
                            Back to Lists
                        </Button>
                    ) : (
                        <ButtonLink
                            className="list-header__back-button"
                            to="/lists"
                        >
                            Back to Lists
                        </ButtonLink>
                    )}
                    <Button
                        aria-label="Add Entry"
                        className="list-header__add-button"
                        disabled={isAddItemDisabled}
                        onClick={onAddItem}
                        variant={isAddItemDisabled ? "disabled" : "default"}
                    >
                        Add Entry
                    </Button>
                </div>
            </div>
        </div>
    );
}
