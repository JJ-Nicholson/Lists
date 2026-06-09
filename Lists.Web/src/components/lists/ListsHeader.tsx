import { Button } from "../Button";

type ListsHeaderProps = {
    disabled?: boolean;
    onCreateList: () => void;
};

export default function ListsHeader({
    disabled = false,
    onCreateList,
}: ListsHeaderProps) {
    return (
        <div className="page__header">
            <p className="eyebrow">Let's Plan!</p>

            <div className="page__header-row">
                <h1 className="heading heading--small">Your Lists</h1>
                <Button disabled={disabled} onClick={onCreateList}>
                    Create List
                </Button>
            </div>
        </div>
    );
}
