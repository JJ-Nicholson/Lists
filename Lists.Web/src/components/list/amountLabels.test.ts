import { describe, expect, it } from "vitest";

import { getAmountFieldLabel, getAmountSortLabel } from "./amountLabels";

describe("amount labels", () => {
    it.each([
        { unitLabel: "$", sortLabel: "Price", fieldLabel: "Price ($)" },
        { unitLabel: "kg", sortLabel: "kg", fieldLabel: "Amount (kg)" },
        { unitLabel: null, sortLabel: "Amount", fieldLabel: "Amount" },
    ])(
        "uses labels for $unitLabel",
        ({ unitLabel, sortLabel, fieldLabel }) => {
            expect(getAmountSortLabel(unitLabel)).toBe(sortLabel);
            expect(getAmountFieldLabel(unitLabel)).toBe(fieldLabel);
        },
    );
});
