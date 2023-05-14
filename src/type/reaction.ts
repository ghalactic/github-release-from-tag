import {
  DISCUSSION_REACTIONS,
  RELEASE_REACTIONS,
} from "../constant/reaction.js";

export type DiscussionReaction = (typeof DISCUSSION_REACTIONS)[number];
export type ReleaseReaction = (typeof RELEASE_REACTIONS)[number];
