import { RestEndpointMethodTypes } from "@octokit/action";
import { ReposApi } from "../../src/type/octokit.js";

type AlreadyExistsSubError = { resource: string; code: string };

class AlreadyExistsError extends Error {
  public response: {
    data: {
      errors: AlreadyExistsSubError[];
    };
  };

  constructor(message: string, errors: AlreadyExistsSubError[]) {
    super(message);

    this.response = { data: { errors } };
  }
}

export function createAlreadyExistsError(): AlreadyExistsError {
  return new AlreadyExistsError("Already exists", [
    { resource: "resource-a", code: "code-a" },
    { resource: "Release", code: "already_exists" },
    { resource: "resource-b", code: "code-b" },
  ]);
}

type CreateReposParameters = {
  createReleaseError?: Error;
  getReleaseByTagError?: Error;
  updateReleaseError?: Error;
};

type OctokitRepos = RestEndpointMethodTypes["repos"];
type CreateReleaseParameters = OctokitRepos["createRelease"]["parameters"];
type CreateReleaseResponse = OctokitRepos["createRelease"]["response"];
type GenerateReleaseNotesParameters =
  OctokitRepos["generateReleaseNotes"]["parameters"];
type GenerateReleaseNotesResponse =
  OctokitRepos["generateReleaseNotes"]["response"];
type GetReleaseByTagParameters = OctokitRepos["getReleaseByTag"]["parameters"];
type GetReleaseByTagResponse = OctokitRepos["getReleaseByTag"]["response"];
type UpdateReleaseParameters = OctokitRepos["updateRelease"]["parameters"];
type UpdateReleaseResponse = OctokitRepos["updateRelease"]["response"];

export function createRepos({
  createReleaseError,
  getReleaseByTagError,
  updateReleaseError,
}: CreateReposParameters = {}): ReposApi {
  return {
    async createRelease(
      parameters: CreateReleaseParameters
    ): Promise<CreateReleaseResponse> {
      if (createReleaseError) throw createReleaseError;

      return { data: parameters } as unknown as CreateReleaseResponse;
    },

    async generateReleaseNotes({
      owner,
      repo,
      tag_name,
    }: GenerateReleaseNotesParameters): Promise<GenerateReleaseNotesResponse> {
      return {
        data: {
          body: JSON.stringify(
            { releaseNotesBody: true, owner, repo, tag_name },
            null,
            2
          ),
        },
      } as unknown as GenerateReleaseNotesResponse;
    },

    async getReleaseByTag({
      owner,
      repo,
      tag,
    }: GetReleaseByTagParameters): Promise<GetReleaseByTagResponse> {
      if (getReleaseByTagError) throw getReleaseByTagError;

      return {
        data: { id: `${owner}.${repo}.${tag}` },
      } as unknown as GetReleaseByTagResponse;
    },

    async updateRelease(
      data: UpdateReleaseParameters
    ): Promise<UpdateReleaseResponse> {
      if (updateReleaseError) throw updateReleaseError;

      return { data } as unknown as UpdateReleaseResponse;
    },
  } as ReposApi;
}
