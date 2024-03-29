import { describe, expect, it } from "vitest";
import { validateConfig } from "../../../src/config/validation.js";
import { isError } from "../../../src/guard.js";

const nonArrayData = [["a"], [null], [true], [false], [111], [{}]] as const;
const nonObjectData = [["a"], [null], [true], [false], [111], [[]]] as const;

describe("validateConfig()", () => {
  it("doesn't throw for minimal valid configs", () => {
    expect(() => {
      validateConfig({});
    }).not.toThrow();
  });

  it("doesn't throw for comprehensive valid configs", () => {
    const config = {
      assets: [
        {
          path: "assets/text/file-a.txt",
        },
        {
          path: "assets/json/file-b.json",
        },
      ],
    };

    expect(() => {
      validateConfig(config);
    }).not.toThrow();
  });

  it("doesn't throw for configs with an explicitly specified empty assets list", () => {
    const config = {
      assets: [],
    };

    expect(() => {
      validateConfig(config);
    }).not.toThrow();
  });

  it("applies the default value for assets", () => {
    expect(validateConfig({})).toMatchObject({
      assets: [],
    });
  });

  it("produces errors that describe all problems", () => {
    const config = {
      additional: true,
      assets: [{}],
    };

    let actual;

    try {
      validateConfig(config);
    } catch (error) {
      actual = isError(error) ? error.message : "unknown cause";
    }

    expect(actual).toMatch(`  - must NOT have additional properties`);
    expect(actual).toMatch(
      `  - must have required property 'path' (/assets/0)`,
    );
  });

  it.each(nonObjectData)("throws for non-object configs (%j)", (config) => {
    expect(() => {
      validateConfig(config);
    }).toThrow(`must be object`);
  });

  it("throws for configs with additional properties", () => {
    const config = {
      additional: true,
    };

    expect(() => {
      validateConfig(config);
    }).toThrow(`must NOT have additional properties`);
  });

  it.each(nonArrayData)("throws for non-array asset lists (%j)", (assets) => {
    const config = {
      assets,
    };

    expect(() => {
      validateConfig(config);
    }).toThrow(`must be array (/assets)`);
  });

  it.each(nonObjectData)("throws for non-object assets (%j)", (asset) => {
    const config = {
      assets: [asset],
    };

    expect(() => {
      validateConfig(config);
    }).toThrow(`must be object (/assets/0)`);
  });

  it("throws for assets with empty paths", () => {
    const config = {
      assets: [
        {
          path: "",
        },
      ],
    };

    expect(() => {
      validateConfig(config);
    }).toThrow(`must NOT have fewer than 1 characters (/assets/0/path)`);
  });

  it("throws for assets with missing paths", () => {
    const config = {
      assets: [{}],
    };

    expect(() => {
      validateConfig(config);
    }).toThrow(`must have required property 'path' (/assets/0)`);
  });

  it("throws for assets with additional properties", () => {
    const config = {
      assets: [
        {
          path: ".",
          additional: true,
        },
      ],
    };

    expect(() => {
      validateConfig(config);
    }).toThrow(`must NOT have additional properties (/assets/0)`);
  });
});
