import { join } from "path";
import { GraphqlApi, ReposApi, TaggerData } from "./type/octokit.js";

export async function getTagger({
  graphql,
  owner,
  repo,
  tag,
}: {
  graphql: GraphqlApi;
  owner: string;
  repo: string;
  tag: string;
}): Promise<TaggerData | undefined> {
  const query = `
    query getTaggerByRef ($owner: String!, $repo: String!, $ref: String!) {
      repository (owner: $owner, name: $repo) {
        ref(qualifiedName: $ref) {
          target {
            ...on Tag {
              tagger {
                user {
                  login
                  avatarUrl
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = (await graphql({
    query,
    owner,
    repo,
    ref: `refs/tags/${tag}`,
  })) as {
    repository: {
      ref: {
        target:
          | {
              tagger:
                | {
                    user: TaggerData;
                  }
                | undefined;
            }
          | undefined;
      };
    };
  };

  return result.repository.ref.target?.tagger?.user;
}

export async function getTagHtmlUrl({
  repos,
  owner,
  repo,
  tag,
}: {
  repos: ReposApi;
  owner: string;
  repo: string;
  tag: string;
}): Promise<string> {
  const { data } = await repos.get({ owner, repo });
  const url = new URL(data.html_url);
  url.pathname = join(url.pathname, "tree", tag);

  return url.toString();
}
