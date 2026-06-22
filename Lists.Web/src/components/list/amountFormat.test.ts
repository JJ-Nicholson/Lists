import { describe, expect, it } from "vitest";

import { formatListAmount } from "./amountFormat";

describe("formatListAmount", () => {
    it.each([
        { amount: 1234.5, unitLabel: "$", expected: "$1,234.50" },
        { amount: -4.5, unitLabel: "$", expected: "-$4.50" },
        { amount: 1234.5, unitLabel: "kg", expected: "1,234.5 kg" },
        { amount: 4.5, unitLabel: null, expected: "4.5" },
    ])("formats $amount with $unitLabel", ({ amount, unitLabel, expected }) => {
        expect(formatListAmount(amount, unitLabel)).toBe(expected);
    });
});
