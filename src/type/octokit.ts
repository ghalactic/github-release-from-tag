import { Octokit, RestEndpointMethodTypes } from "@octokit/action";

export type GraphqlApi = Octokit["graphql"];
export type ReactionsApi = Octokit["reactions"];
export type ReposApi = Octokit["repos"];
export type RequestApi = Octokit["request"];

export type AssetData = ReposTypes["getReleaseAsset"]["response"]["data"];
export type ReleaseData = ReposTypes["getRelease"]["response"]["data"];
export type TaggerData = { avatarUrl: string; login: string };

type ReposTypes = RestEndpointMethodTypes["repos"];
