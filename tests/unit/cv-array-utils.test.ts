import { removeArrayItemAt } from "@/lib/cv/array-utils";

describe("removeArrayItemAt", () => {
  it("removes only the selected entry and preserves the remaining order", () => {
    const entries = [
      { title: "First" },
      { title: "Second" },
      { title: "Third" },
    ];

    expect(removeArrayItemAt(entries, 1)).toEqual([
      { title: "First" },
      { title: "Third" },
    ]);
    expect(entries).toHaveLength(3);
  });

  it("keeps all entries when the requested index is invalid", () => {
    const entries = [{ degree: "First" }, { degree: "Second" }];

    expect(removeArrayItemAt(entries, -1)).toEqual(entries);
    expect(removeArrayItemAt(entries, 2)).toEqual(entries);
    expect(removeArrayItemAt(entries, 0.5)).toEqual(entries);
  });

  it("leaves an empty section only after its final entry is removed", () => {
    expect(removeArrayItemAt([{ title: "Only experience" }], 0)).toEqual([]);
  });
});
