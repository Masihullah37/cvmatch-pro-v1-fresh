import { asEditableStringArray, asStringArray } from "@/components/templates/normalizeCvArrays";

describe("editable CV arrays", () => {
  it("preserves a new blank skill entry until the user types into it", () => {
    const skills = ["PostgreSQL", ""];

    expect(asStringArray(skills)).toEqual(["PostgreSQL"]);
    expect(asEditableStringArray(skills)).toEqual(["PostgreSQL", ""]);
  });
});
