import { validateConfig } from "../../../src/config/validation.js";
import { createOrUpdateRelease } from "../../../src/release.js";
import { group, info } from "../../mocks/actions-core.js";
import {
  createAlreadyExistsError,
  createRepos,
} from "../../mocks/oktokit-repos.js";

describe("createOrUpdateRelease()", () => {
  const staticParams = {
    config: validateConfig({
      discussion: {},
      draft: false,
    }),
    group,
    info,
    owner: "owner-a",
    repo: "repo-a",
    releaseBody: "release-body-a",
    tag: "tag-a",
    tagSubject: "tag-subject-a",
    isStable: true,
  };

  const defaultExpectation = {
    owner: "owner-a",
    repo: "repo-a",
    tag_name: "tag-a",
    name: "tag-subject-a",
    body: "release-body-a",
    draft: false,
    prerelease: false,
  };

  const releaseId = "owner-a.repo-a.tag-a";

  it("should create a new release when no matching release exists", async () => {
    const repos = createRepos();

    const [actual, wasCreated] = await createOrUpdateRelease({
      ...staticParams,
      repos,
    });

    expect(wasCreated).toBe(true);
    expect(actual).toMatchObject(defaultExpectation);
  });

  it("should update the existing release when a matching release exists", async () => {
    const repos = createRepos({
      createReleaseError: createAlreadyExistsError(),
    });

    const [actual, wasCreated] = await createOrUpdateRelease({
      ...staticParams,
      repos,
    });

    expect(wasCreated).toBe(false);
    expect(actual).toMatchObject({
      ...defaultExpectation,
      release_id: releaseId,
    });
  });

  it("should honor the isStable option", async () => {
    const repos = createRepos();

    const [actual, wasCreated] = await createOrUpdateRelease({
      ...staticParams,
      repos,
      isStable: false,
    });

    expect(wasCreated).toBe(true);
    expect(actual).toMatchObject({ ...defaultExpectation, prerelease: true });
  });

  it("should honor the config.draft option", async () => {
    const repos = createRepos();

    const config = { ...staticParams.config, draft: true };
    const [actual, wasCreated] = await createOrUpdateRelease({
      ...staticParams,
      repos,
      config,
    });

    expect(wasCreated).toBe(true);
    expect(actual).toMatchObject({ ...defaultExpectation, draft: true });
  });

  describe("error propagation", () => {
    it("should propagate errors during release creation", async () => {
      const error = new Error("error-a");
      const repos = createRepos({
        createReleaseError: error,
      });

      await expect(() =>
        createOrUpdateRelease({ ...staticParams, repos }),
      ).rejects.toThrow(error);
    });

    it("should propagate errors during reading of existing releases", async () => {
      const error = new Error("error-a");
      const repos = createRepos({
        createReleaseError: createAlreadyExistsError(),
        getReleaseByTagError: error,
      });

      await expect(() =>
        createOrUpdateRelease({ ...staticParams, repos }),
      ).rejects.toThrow(error);
    });

    it("should propagate errors during updating of existing releases", async () => {
      const error = new Error("error-a");
      const repos = createRepos({
        createReleaseError: createAlreadyExistsError(),
        updateReleaseError: error,
      });

      await expect(() =>
        createOrUpdateRelease({ ...staticParams, repos }),
      ).rejects.toThrow(error);
    });
  });
});
