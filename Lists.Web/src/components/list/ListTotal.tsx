import { formatListAmount } from "./amountFormat";

type ListTotalProps = {
    isFiltered?: boolean;
    totalAmount: number;
    unitLabel?: string | null;
};

function getTotalLabel(isFiltered: boolean): string {
    return isFiltered ? "Filtered Total" : "Total";
}

export default function ListTotal({
    isFiltered = false,
    totalAmount,
    unitLabel,
}: ListTotalProps) {
    return (
        <div className="list-total">
            <span className="list-total__label">
                {getTotalLabel(isFiltered)}:
            </span>
            <strong className="list-total__amount">
                {formatListAmount(totalAmount, unitLabel)}
            </strong>
        </div>
    );
}
