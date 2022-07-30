import { getDiscussionIdByUrl } from "./discussion.js";

export const GRAPHQL_REACTION_CONTENT = {
  "+1": "THUMBS_UP",
  "-1": "THUMBS_DOWN",
  laugh: "LAUGH",
  hooray: "HOORAY",
  confused: "CONFUSED",
  heart: "HEART",
  rocket: "ROCKET",
  eyes: "EYES",
};

export async function createDiscussionReactions({
  config,
  graphql,
  group,
  info,
  owner,
  release,
  repo,
  setOutput,
}) {
  if (config.discussion.reactions.length < 1) {
    info("No release discussion reactions to create");

    return;
  }

  if (!release.discussion_url) {
    info("No release discussion to react to");

    return;
  }

  await group("Creating release discussion reactions", async () => {
    const discussionId = await getDiscussionIdByUrl({
      graphql,
      owner,
      repo,
      setOutput,
      url: release.discussion_url,
    });

    await Promise.all(config.discussion.reactions.map(createReaction));

    async function createReaction(content) {
      const query = `
        mutation createDiscussionReaction ($discussionId: ID!, $content: ReactionContent!) {
          addReaction (input: {subjectId: $discussionId, content: $content}) {
            clientMutationId
          }
        }
      `;

      await graphql({
        query,
        discussionId,
        content: GRAPHQL_REACTION_CONTENT[content],
      });

      info(`Created ${content} reaction`);
    }
  });
}

export async function createReleaseReactions({
  config,
  group,
  info,
  owner,
  reactions,
  release,
  repo,
}) {
  if (config.reactions.length < 1) {
    info("No release reactions to create");

    return;
  }

  await group("Creating release reactions", async () => {
    await Promise.all(config.reactions.map(createReaction));

    async function createReaction(content) {
      await reactions.createForRelease({
        owner,
        repo,
        release_id: release.id,
        content,
      });

      info(`Created ${content} reaction`);
    }
  });
}
