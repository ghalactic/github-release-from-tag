import type { RestEndpointMethodTypes } from "@octokit/action";
import { describe, expect, it, vi } from "vitest";
import {
  LATEST_RELEASE_ID,
  LATEST_RELEASE_NAME,
  LATEST_RELEASE_URL,
  RELEASE_IS_LATEST,
} from "../../../src/constant/output.js";
import { compareLatestRelease } from "../../../src/release.js";
import type { ReleaseData } from "../../../src/type/octokit.js";
import { group, info } from "../../mocks/actions-core.js";
import { createNotFoundError, createRepos } from "../../mocks/oktokit-repos.js";

describe("compareLatestRelease()", () => {
  const staticParams = {
    group,
    info,
    owner: "owner-a",
    release: { id: 111 } as ReleaseData,
    repo: "repo-a",
  } as const;

  describe("when there is no current latest release", () => {
    it("sets the appropriate outputs", async () => {
      const repos = createRepos({
        getLatestReleaseError: createNotFoundError(),
      });
      const setOutput = vi.fn();
      const [latestRelease, isLatest] = await compareLatestRelease({
        ...staticParams,
        repos,
        setOutput,
      });

      expect(latestRelease).toBeUndefined();
      expect(isLatest).toBe(false);
      expect(setOutput).toBeCalledWith(LATEST_RELEASE_ID, "");
      expect(setOutput).toBeCalledWith(LATEST_RELEASE_NAME, "");
      expect(setOutput).toBeCalledWith(LATEST_RELEASE_URL, "");
      expect(setOutput).toBeCalledWith(RELEASE_IS_LATEST, "");
    });
  });

  describe("when the release is the latest release", () => {
    it("sets the appropriate outputs", async () => {
      const expectedLatestRelease = {
        id: 111,
        name: "Release A",
        html_url: "https://example.com/a",
      } as ReleaseData;
      const repos = createRepos();
      vi.spyOn(repos, "getLatestRelease").mockResolvedValue({
        data: expectedLatestRelease,
      } as GetLatestReleaseResponse);
      const setOutput = vi.fn();
      const [latestRelease, isLatest] = await compareLatestRelease({
        ...staticParams,
        repos,
        setOutput,
      });

      expect(latestRelease).toEqual(expectedLatestRelease);
      expect(isLatest).toBe(true);
      expect(setOutput).toBeCalledWith(LATEST_RELEASE_ID, "111");
      expect(setOutput).toBeCalledWith(LATEST_RELEASE_NAME, "Release A");
      expect(setOutput).toBeCalledWith(
        LATEST_RELEASE_URL,
        "https://example.com/a",
      );
      expect(setOutput).toBeCalledWith(RELEASE_IS_LATEST, "true");
    });
  });

  describe("when the release isn't the latest release", () => {
    it("sets the appropriate outputs", async () => {
      const expectedLatestRelease = {
        id: 222,
        name: "Release B",
        html_url: "https://example.com/b",
      } as ReleaseData;
      const repos = createRepos();
      vi.spyOn(repos, "getLatestRelease").mockResolvedValue({
        data: expectedLatestRelease,
      } as GetLatestReleaseResponse);
      const setOutput = vi.fn();
      const [latestRelease, isLatest] = await compareLatestRelease({
        ...staticParams,
        repos,
        setOutput,
      });

      expect(latestRelease).toEqual(expectedLatestRelease);
      expect(isLatest).toBe(false);
      expect(setOutput).toBeCalledWith(LATEST_RELEASE_ID, "222");
      expect(setOutput).toBeCalledWith(LATEST_RELEASE_NAME, "Release B");
      expect(setOutput).toBeCalledWith(
        LATEST_RELEASE_URL,
        "https://example.com/b",
      );
      expect(setOutput).toBeCalledWith(RELEASE_IS_LATEST, "");
    });
  });

  describe("when the latest release has a null name", () => {
    it("sets the appropriate outputs", async () => {
      const expectedLatestRelease = {
        id: 111,
        name: null,
        html_url: "https://example.com/a",
      } as ReleaseData;
      const repos = createRepos();
      vi.spyOn(repos, "getLatestRelease").mockResolvedValue({
        data: expectedLatestRelease,
      } as GetLatestReleaseResponse);
      const setOutput = vi.fn();
      const [latestRelease, isLatest] = await compareLatestRelease({
        ...staticParams,
        repos,
        setOutput,
      });

      expect(latestRelease).toEqual(expectedLatestRelease);
      expect(isLatest).toBe(true);
      expect(setOutput).toBeCalledWith(LATEST_RELEASE_ID, "111");
      expect(setOutput).toBeCalledWith(LATEST_RELEASE_NAME, "");
      expect(setOutput).toBeCalledWith(
        LATEST_RELEASE_URL,
        "https://example.com/a",
      );
      expect(setOutput).toBeCalledWith(RELEASE_IS_LATEST, "true");
    });
  });

  describe("Error propagation", () => {
    it("propagates errors during latest release fetching", async () => {
      const error = new Error("error-a");
      const repos = createRepos({ getLatestReleaseError: error });

      await expect(() =>
        compareLatestRelease({ ...staticParams, repos, setOutput: () => {} }),
      ).rejects.toThrow(error);
    });
  });
});

type OctokitRepos = RestEndpointMethodTypes["repos"];
type GetLatestReleaseResponse = OctokitRepos["getLatestRelease"]["response"];
