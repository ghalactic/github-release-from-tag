export const THUMBS_UP = "+1";
export const THUMBS_DOWN = "-1";
export const LAUGH = "laugh";
export const HOORAY = "hooray";
export const CONFUSED = "confused";
export const HEART = "heart";
export const ROCKET = "rocket";
export const EYES = "eyes";

export const DISCUSSION_REACTIONS = [
  THUMBS_UP,
  THUMBS_DOWN,
  LAUGH,
  HOORAY,
  CONFUSED,
  HEART,
  ROCKET,
  EYES,
] as const;

export const RELEASE_REACTIONS = [
  THUMBS_UP,
  LAUGH,
  HOORAY,
  HEART,
  ROCKET,
  EYES,
] as const;

export const REACTION_NAMES = {
  [THUMBS_UP]: "THUMBS_UP",
  [THUMBS_DOWN]: "THUMBS_DOWN",
  [LAUGH]: "LAUGH",
  [HOORAY]: "HOORAY",
  [CONFUSED]: "CONFUSED",
  [HEART]: "HEART",
  [ROCKET]: "ROCKET",
  [EYES]: "EYES",
} as const;
