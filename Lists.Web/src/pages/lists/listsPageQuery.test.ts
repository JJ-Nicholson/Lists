import { describe, expect, it } from "vitest";

import {
    DEFAULT_LISTS_PAGE_SIZE,
    DEFAULT_SORT_DIRECTION,
} from "./listsPageConfig";
import {
    getListsPageSize,
    getListsQueryParams,
    getPositiveInteger,
    getSortDirection,
} from "./listsPageQuery";

describe("listsPageQuery", () => {
    describe("getPositiveInteger", () => {
        it("returns positive integers", () => {
            expect(getPositiveInteger("3", 1)).toBe(3);
        });

        it("returns the default for invalid values", () => {
            expect(getPositiveInteger(null, 7)).toBe(7);
            expect(getPositiveInteger("", 7)).toBe(7);
            expect(getPositiveInteger("0", 7)).toBe(7);
            expect(getPositiveInteger("-1", 7)).toBe(7);
            expect(getPositiveInteger("1.5", 7)).toBe(7);
            expect(getPositiveInteger("abc", 7)).toBe(7);
        });
    });

    describe("getListsPageSize", () => {
        it("returns configured page sizes", () => {
            expect(getListsPageSize("3")).toBe(3);
            expect(getListsPageSize("24")).toBe(24);
        });

        it("returns the default page size for unsupported values", () => {
            expect(getListsPageSize("5")).toBe(DEFAULT_LISTS_PAGE_SIZE);
            expect(getListsPageSize(null)).toBe(DEFAULT_LISTS_PAGE_SIZE);
        });
    });

    describe("getSortDirection", () => {
        it("returns descending when requested", () => {
            expect(getSortDirection("desc")).toBe("desc");
        });

        it("returns the default sort direction for all other values", () => {
            expect(getSortDirection("asc")).toBe(DEFAULT_SORT_DIRECTION);
            expect(getSortDirection("sideways")).toBe(DEFAULT_SORT_DIRECTION);
            expect(getSortDirection(null)).toBe(DEFAULT_SORT_DIRECTION);
        });
    });

    describe("getListsQueryParams", () => {
        it("omits the page size when it matches the default", () => {
            expect(
                getListsQueryParams({
                    page: 1,
                    pageSize: DEFAULT_LISTS_PAGE_SIZE,
                    search: "groceries",
                    sortDirection: "asc",
                }),
            ).toEqual({
                page: 1,
                search: "groceries",
                sortDirection: "asc",
            });
        });

        it("includes a non-default page size", () => {
            expect(
                getListsQueryParams({
                    page: 2,
                    pageSize: 24,
                    search: "",
                    sortDirection: "desc",
                }),
            ).toEqual({
                page: 2,
                pageSize: 24,
                search: "",
                sortDirection: "desc",
            });
        });
    });
});
