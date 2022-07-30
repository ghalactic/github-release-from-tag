export function createAlreadyExistsError() {
  const error = new Error("Already exists");

  error.response = {
    data: {
      errors: [
        { resource: "resource-a", code: "code-a" },
        { resource: "Release", code: "already_exists" },
        { resource: "resource-b", code: "code-b" },
      ],
    },
  };

  return error;
}

export function createRepos({
  createReleaseError,
  getReleaseByTagError,
  updateReleaseError,
} = {}) {
  return {
    async createRelease(data) {
      if (createReleaseError) throw createReleaseError;

      return { data };
    },

    async generateReleaseNotes({ owner, repo, tag_name }) {
      return {
        data: {
          body: JSON.stringify(
            { releaseNotesBody: true, owner, repo, tag_name },
            null,
            2
          ),
        },
      };
    },

    async getReleaseByTag({ owner, repo, tag }) {
      if (getReleaseByTagError) throw getReleaseByTagError;

      return { data: { id: `${owner}.${repo}.${tag}` } };
    },

    async updateRelease(data) {
      if (updateReleaseError) throw updateReleaseError;

      return { data };
    },
  };
}
