const amountFormatter = new Intl.NumberFormat("en-NZ", {
    maximumFractionDigits: 2,
});

const dollarAmountFormatter = new Intl.NumberFormat("en-NZ", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
});

function getNormalisedUnitLabel(unitLabel?: string | null): string {
    return unitLabel?.trim() ?? "";
}

export function formatListAmount(
    amount: number,
    unitLabel?: string | null,
): string {
    const normalisedUnitLabel = getNormalisedUnitLabel(unitLabel);

    if (normalisedUnitLabel === "$") {
        const absoluteAmount = Math.abs(amount);
        const formattedAmount = dollarAmountFormatter.format(absoluteAmount);
        const sign = amount < 0 ? "-" : "";

        return `${sign}$${formattedAmount}`;
    }

    const formattedAmount = amountFormatter.format(amount);

    return normalisedUnitLabel
        ? `${formattedAmount} ${normalisedUnitLabel}`
        : formattedAmount;
}
