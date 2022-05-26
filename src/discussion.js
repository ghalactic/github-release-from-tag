export async function getDiscussionIdByUrl ({
  graphql,
  owner,
  repo,
  setOutput,
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

  const number = getDiscussionNumberByUrl(url)

  setOutput('discussionNumber', number)
  setOutput('discussionUrl', url)

  const result = await graphql({
    query,
    owner,
    repo,
    number,
  })

  const id = result.repository.discussion.id

  setOutput('discussionId', id)

  return id
}

export function getDiscussionNumberByUrl (url) {
  const {pathname} = new URL(url)
  const numberString = decodeURIComponent(pathname.split('/').pop())

  return parseInt(numberString, 10)
}
