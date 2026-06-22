import { describe, expect, it } from "vitest";

import { render, screen } from "../../test/render";
import ListTotal from "./ListTotal";

describe("ListTotal", () => {
    it.each([
        { isFiltered: false, label: "Total:" },
        { isFiltered: true, label: "Filtered Total:" },
    ])("renders $label", ({ isFiltered, label }) => {
        render(
            <ListTotal
                isFiltered={isFiltered}
                totalAmount={7.75}
                unitLabel="$"
            />,
        );

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByText("$7.75")).toBeInTheDocument();
    });
});
