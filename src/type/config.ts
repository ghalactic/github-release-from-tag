import { DiscussionReaction, ReleaseReaction } from "./reaction.js";

export type DiscussionConfig = {
  category: string;
  reactions: DiscussionReaction[];
};

export type SummaryConfig = {
  enabled: boolean;
};

export type Config = {
  assets: AssetConfig[];
  discussion: DiscussionConfig;
  draft: boolean;
  generateReleaseNotes: boolean;
  prerelease: boolean;
  reactions: ReleaseReaction[];
  summary: SummaryConfig;
};

export type AssetConfig = {
  label: string;
  name: string;
  optional: boolean;
  path: string;
};
