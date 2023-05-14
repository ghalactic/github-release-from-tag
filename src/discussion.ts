import {
  DISCUSSION_ID,
  DISCUSSION_NUMBER,
  DISCUSSION_URL,
} from "./constant/output.js";
import { SetOutputFn } from "./type/actions.js";
import { GraphqlApi } from "./type/octokit.js";

export async function getDiscussionIdByUrl({
  graphql,
  owner,
  repo,
  setOutput,
  url,
}: {
  graphql: GraphqlApi;
  owner: string;
  repo: string;
  setOutput: SetOutputFn;
  url: string;
}): Promise<string> {
  const query = `
    query getDiscussionIdByNumber ($owner: String!, $repo: String!, $number: Int!) {
      repository (owner: $owner, name: $repo) {
        discussion (number: $number) {
          id
        }
      }
    }
  `;

  const number = getDiscussionNumberByUrl(url);

  setOutput(DISCUSSION_NUMBER, number);
  setOutput(DISCUSSION_URL, url);

  const result = (await graphql({
    query,
    owner,
    repo,
    number,
  })) as {
    repository: {
      discussion: {
        id: string;
      };
    };
  };

  const id = result.repository.discussion.id;
  setOutput(DISCUSSION_ID, id);

  return id;
}

export function getDiscussionNumberByUrl(url: string): number {
  const { pathname } = new URL(url);
  const numberString = decodeURIComponent(pathname.split("/").pop() as string);

  return parseInt(numberString, 10);
}
