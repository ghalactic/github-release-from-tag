import type { MakeLatestStrategy } from "./make-latest-strategy.js";
import { DiscussionReaction, ReleaseReaction } from "./reaction.js";

export type ChecksumConfig = {
  generateAssets: boolean;
};

export type DiscussionConfig = {
  category: string;
  reactions: DiscussionReaction[];
};

export type SummaryConfig = {
  enabled: boolean;
};

export type Config = {
  assets: AssetConfig[];
  checksum: ChecksumConfig;
  discussion: DiscussionConfig;
  draft: boolean;
  generateReleaseNotes: boolean;
  makeLatest: MakeLatestStrategy;
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
