import { REACTION_NAMES } from "./constant/reaction.js";
import { getDiscussionIdByUrl } from "./discussion.js";
import { GroupFn, InfoFn, SetOutputFn } from "./type/actions.js";
import { Config } from "./type/config.js";
import { GraphqlApi, ReactionsApi, ReleaseData } from "./type/octokit.js";
import { DiscussionReaction, ReleaseReaction } from "./type/reaction.js";

export async function createDiscussionReactions({
  config,
  graphql,
  group,
  info,
  owner,
  release,
  repo,
  setOutput,
}: {
  config: Config;
  graphql: GraphqlApi;
  group: GroupFn;
  info: InfoFn;
  owner: string;
  release: ReleaseData;
  repo: string;
  setOutput: SetOutputFn;
}): Promise<void> {
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
      url: release.discussion_url ?? "",
    });

    await Promise.all(config.discussion.reactions.map(createReaction));

    async function createReaction(content: DiscussionReaction): Promise<void> {
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
        content: REACTION_NAMES[content],
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
}: {
  config: Config;
  group: GroupFn;
  info: InfoFn;
  owner: string;
  reactions: ReactionsApi;
  release: ReleaseData;
  repo: string;
}): Promise<void> {
  if (config.reactions.length < 1) {
    info("No release reactions to create");

    return;
  }

  await group("Creating release reactions", async () => {
    await Promise.all(config.reactions.map(createReaction));

    async function createReaction(content: ReleaseReaction): Promise<void> {
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
