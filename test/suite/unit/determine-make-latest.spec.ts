import type { RestEndpointMethodTypes } from "@octokit/action";
import { describe, expect, it, vi } from "vitest";
import { validateConfig } from "../../../src/config/validation.js";
import {
  ALWAYS,
  IF_NEW,
  LEGACY,
  NEVER,
  SEMVER,
} from "../../../src/constant/make-latest-strategy.js";
import { determineMakeLatest } from "../../../src/release.js";
import { group, info } from "../../mocks/actions-core.js";
import { createNotFoundError, createRepos } from "../../mocks/oktokit-repos.js";

describe("determineMakeLatest()", () => {
  const staticParams = {
    config: validateConfig({}),
    group,
    info,
    isPreRelease: false,
    owner: "owner-a",
    repo: "repo-a",
    tag: "tag-a",
  } as const;

  describe("when the release is a pre-release", () => {
    it("doesn't set the latest release", async () => {
      const repos = createRepos();
      const [createMakeLatest, updateMakeLatest] = await determineMakeLatest({
        ...staticParams,
        isPreRelease: true,
        repos,
      });

      expect(createMakeLatest).toBe("false");
      expect(updateMakeLatest).toBe("false");
    });
  });

  describe("when the release is a draft", () => {
    it("doesn't set the latest release", async () => {
      const repos = createRepos();
      const config = { ...staticParams.config, draft: true } as const;
      const [createMakeLatest, updateMakeLatest] = await determineMakeLatest({
        ...staticParams,
        config,
        repos,
      });

      expect(createMakeLatest).toBe("false");
      expect(updateMakeLatest).toBe("false");
    });
  });

  describe('when the "if-new" makeLatest strategy is configured', () => {
    it("sets the latest release for newly created releases", async () => {
      const repos = createRepos();
      const config = { ...staticParams.config, makeLatest: IF_NEW } as const;
      const [createMakeLatest, updateMakeLatest] = await determineMakeLatest({
        ...staticParams,
        config,
        repos,
      });

      expect(createMakeLatest).toBe("true");
      expect(updateMakeLatest).toBe("false");
    });
  });

  describe('when the "always" makeLatest strategy is configured', () => {
    it("always sets the latest release", async () => {
      const repos = createRepos();
      const config = { ...staticParams.config, makeLatest: ALWAYS } as const;
      const [createMakeLatest, updateMakeLatest] = await determineMakeLatest({
        ...staticParams,
        config,
        repos,
      });

      expect(createMakeLatest).toBe("true");
      expect(updateMakeLatest).toBe("true");
    });
  });

  describe('when the "never" makeLatest strategy is configured', () => {
    it("never sets the latest release", async () => {
      const repos = createRepos();
      const config = { ...staticParams.config, makeLatest: NEVER } as const;
      const [createMakeLatest, updateMakeLatest] = await determineMakeLatest({
        ...staticParams,
        config,
        repos,
      });

      expect(createMakeLatest).toBe("false");
      expect(updateMakeLatest).toBe("false");
    });
  });

  describe('when the "legacy" makeLatest strategy is configured', () => {
    it("defers to GitHub's legacy behavior", async () => {
      const repos = createRepos();
      const config = { ...staticParams.config, makeLatest: LEGACY } as const;
      const [createMakeLatest, updateMakeLatest] = await determineMakeLatest({
        ...staticParams,
        config,
        repos,
      });

      expect(createMakeLatest).toBe("legacy");
      expect(updateMakeLatest).toBe("legacy");
    });
  });

  describe('when the "semver" makeLatest strategy is configured', () => {
    describe("when the tag is not SemVer", () => {
      it("doesn't set the latest release", async () => {
        const repos = createRepos();
        const config = {
          ...staticParams.config,
          makeLatest: SEMVER,
        } as const;
        const [createMakeLatest, updateMakeLatest] = await determineMakeLatest({
          ...staticParams,
          config,
          repos,
          tag: "v1",
        });

        expect(createMakeLatest).toBe("false");
        expect(updateMakeLatest).toBe("false");
      });
    });

    describe("when the tag is SemVer and there is no current latest release", () => {
      it("always sets the latest release", async () => {
        const repos = createRepos({
          getLatestReleaseError: createNotFoundError(),
        });
        const config = {
          ...staticParams.config,
          makeLatest: SEMVER,
        } as const;
        const [createMakeLatest, updateMakeLatest] = await determineMakeLatest({
          ...staticParams,
          config,
          repos,
          tag: "v1.0.0",
        });

        expect(createMakeLatest).toBe("true");
        expect(updateMakeLatest).toBe("true");
      });
    });

    describe("when the tag is SemVer and there is a current non-SemVer latest release", () => {
      it("always sets the latest release", async () => {
        const repos = createRepos();
        vi.spyOn(repos, "getLatestRelease").mockResolvedValue({
          data: { tag_name: "v2" },
        } as GetLatestReleaseResponse);

        const config = {
          ...staticParams.config,
          makeLatest: SEMVER,
        } as const;
        const [createMakeLatest, updateMakeLatest] = await determineMakeLatest({
          ...staticParams,
          config,
          repos,
          tag: "v1.0.0",
        });

        expect(createMakeLatest).toBe("true");
        expect(updateMakeLatest).toBe("true");
      });
    });

    describe("when the tag is SemVer and there is a current SemVer latest release", () => {
      it.each`
        description                            | tag             | currentTag      | expectedCreate | expectedUpdate
        ${"lower precedence"}                  | ${"v0.0.1"}     | ${"v0.0.2"}     | ${"false"}     | ${"false"}
        ${"equal precedence"}                  | ${"v0.0.1+a"}   | ${"v0.0.1+b"}   | ${"true"}      | ${"false"}
        ${"higher precedence"}                 | ${"v0.0.2"}     | ${"v0.0.1"}     | ${"true"}      | ${"true"}
        ${"higher precedence but less stable"} | ${"v2.0.0-rc1"} | ${"v1.0.0"}     | ${"false"}     | ${"false"}
        ${"lower precedence but more stable"}  | ${"v1.0.0"}     | ${"v2.0.0-rc1"} | ${"true"}      | ${"true"}
      `(
        "sets the latest release according to SemVer precedence ($description)",
        async ({
          tag,
          currentTag,
          expectedCreate,
          expectedUpdate,
        }: {
          tag: string;
          currentTag: string;
          expectedCreate: string;
          expectedUpdate: string;
        }) => {
          const repos = createRepos();
          vi.spyOn(repos, "getLatestRelease").mockResolvedValue({
            data: { tag_name: currentTag },
          } as GetLatestReleaseResponse);

          const config = {
            ...staticParams.config,
            makeLatest: SEMVER,
          } as const;
          const [createMakeLatest, updateMakeLatest] =
            await determineMakeLatest({
              ...staticParams,
              config,
              repos,
              tag,
            });

          expect(createMakeLatest).toBe(expectedCreate);
          expect(updateMakeLatest).toBe(expectedUpdate);
        },
      );
    });
  });

  describe("Error propagation", () => {
    it("propagates errors during latest release fetching", async () => {
      const error = new Error("error-a");
      const repos = createRepos({ getLatestReleaseError: error });
      const config = {
        ...staticParams.config,
        makeLatest: SEMVER,
      } as const;

      await expect(() =>
        determineMakeLatest({ ...staticParams, config, repos, tag: "v1.0.0" }),
      ).rejects.toThrow(error);
    });
  });
});

type OctokitRepos = RestEndpointMethodTypes["repos"];
type GetLatestReleaseResponse = OctokitRepos["getLatestRelease"]["response"];
