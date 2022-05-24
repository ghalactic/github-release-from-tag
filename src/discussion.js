export async function getDiscussionIdByUrl ({
  graphql,
  owner,
  repo,
  url,
}) {
  const query = `
    query getDiscussionIdByNumber ($owner: String!, $repo: String!, $number: Int!) {
      repository (owner: $owner, name: $repo) {
        discussion (number: $number) {
          id
        }
      }
    }
  `

  const result = await graphql({
    query,
    owner,
    repo,
    number: getDiscussionNumberByUrl(url),
  })

  return result.repository.discussion.id
}

export function getDiscussionNumberByUrl (url) {
  const {pathname} = new URL(url)
  const [/* owner */, /* repo */, /* discussions */, numberString] = pathname.split('/').map(decodeURIComponent)

  return parseInt(numberString, 10)
}
