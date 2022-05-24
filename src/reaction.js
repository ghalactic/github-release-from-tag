import {DISCUSSION_URL_PATTERN} from "./discussion.js"

export async function createDiscussionReactions ({
  config,
  graphql,
  group,
  info,
  owner,
  release,
  repo,
}) {
  if (config.discussion.reactions.length < 1) {
    info('No release discussion reactions to create')

    return
  }

  if (!release.discussion_url) {
    info('No release discussion to react to')

    return
  }

  await group('Creating release discussion reactions', async () => {
    const discussionId = await getDiscussionIdByUrl(release.discussion_url)

    await Promise.all(config.discussion.reactions.map(createReaction))

    async function createReaction (content) {
      const query = `
        mutation createDiscussionReaction ($discussionId: ID!, $content: String!) {
          addReaction (input: {subjectId: $discussionId, content: $content}) {
            clientMutationId
          }
        }
      `

      await graphql({
        query,
        discussionId,
        content,
      })

      info(`Created ${content} reaction`)
    }
  })

  async function getDiscussionIdByUrl (url) {
    const [, numberString] = DISCUSSION_URL_PATTERN.exec(url)
    const number = parseInt(numberString, 10)

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
      number,
    })

    return result.repository.discussion.id
  }
}

export async function createReleaseReactions ({
  config,
  group,
  info,
  owner,
  reactions,
  release,
  repo,
}) {
  if (config.reactions.length < 1) {
    info('No release reactions to create')

    return
  }

  await group('Creating release reactions', async () => {
    await Promise.all(config.reactions.map(createReaction))

    async function createReaction (content) {
      await reactions.createForRelease({
        owner,
        repo,
        release_id: release.id,
        content,
      })

      info(`Created ${content} reaction`)
    }
  })
}
