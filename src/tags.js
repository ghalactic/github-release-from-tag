import { join } from "path";

export async function getTagger({ graphql, owner, repo, tag }) {
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

  const result = await graphql({
    query,
    owner,
    repo,
    ref: `refs/tags/${tag}`,
  });

  return result.repository.ref.target?.tagger?.user;
}

export async function getTagHtmlUrl({ repos, owner, repo, tag }) {
  const { data } = await repos.get({ owner, repo });
  const url = new URL(data.html_url);
  url.pathname = join(url.pathname, "tree", tag);

  return url.toString();
}
