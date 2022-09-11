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
