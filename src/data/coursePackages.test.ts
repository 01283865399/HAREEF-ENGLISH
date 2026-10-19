import { describe, expect, it } from "vitest";
import { coursePackageTemplates } from "./coursePackages";

describe("course package catalogue", () => {
  it("contains every grade, system, and term with distinct reasonable prices", () => {
    expect(coursePackageTemplates).toHaveLength(18);
    expect(new Set(coursePackageTemplates.map(({ id }) => id)).size).toBe(18);
    expect(new Set(coursePackageTemplates.map(({ title }) => title)).size).toBe(
      18,
    );
    expect(
      coursePackageTemplates.every(({ title }) =>
        title.startsWith("English Course - ") && !/[\u0600-\u06ff]/u.test(title),
      ),
    ).toBe(true);
    expect(coursePackageTemplates[0]?.title).toBe(
      "English Course - Grade 1 - General Secondary - Term 1",
    );
    expect(
      new Set(coursePackageTemplates.map(({ priceAmount }) => priceAmount))
        .size,
    ).toBe(18);
    expect(
      coursePackageTemplates.every(
        ({ priceAmount }) => priceAmount >= 229 && priceAmount <= 314,
      ),
    ).toBe(true);
  });
});
