function getNormalisedUnitLabel(unitLabel?: string | null): string {
    return unitLabel?.trim() ?? "";
}

export function getAmountSortLabel(unitLabel?: string | null): string {
    const normalisedUnitLabel = getNormalisedUnitLabel(unitLabel);

    if (normalisedUnitLabel === "$") {
        return "Price";
    }

    return normalisedUnitLabel || "Amount";
}

export function getAmountFieldLabel(unitLabel?: string | null): string {
    const normalisedUnitLabel = getNormalisedUnitLabel(unitLabel);

    if (!normalisedUnitLabel) {
        return "Amount";
    }

    if (normalisedUnitLabel === "$") {
        return "Price ($)";
    }

    return `Amount (${normalisedUnitLabel})`;
}
