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
    return Promise.all(config.reactions.map(createReaction))
  })

  async function createReaction (content) {
    await reactions.createForRelease({
      owner,
      repo,
      release_id: release.id,
      content,
    })

    info(`Created ${content} reaction`)
  }
}
