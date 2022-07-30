export const CONFIG =
  "https://lqnt.co/github-release-action/config.schema.json";
export const ASSETS =
  "https://lqnt.co/github-release-action/assets.schema.json";

export const config = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: CONFIG,
  title: "GitHub Release from Tag (Configuration)",
  description: 'Configuration for the "GitHub Release from Tag" GitHub Action.',
  type: "object",
  additionalProperties: false,
  properties: {
    assets: {
      $ref: ASSETS,
      default: [],
    },
    discussion: {
      description: "Options for creating discussions linked to releases.",
      type: "object",
      additionalProperties: false,
      default: {},
      properties: {
        category: {
          description:
            "The category to use when creating the discussion. The value must be a category that already exists in the repository.",
          type: "string",
          default: "",
        },
        reactions: {
          description:
            "Reactions to create for discussions linked to releases.",
          type: "array",
          default: [],
          items: {
            description:
              "A reaction to create for discussions linked to releases.",
            type: "string",
            enum: [
              "+1",
              "-1",
              "laugh",
              "hooray",
              "confused",
              "heart",
              "rocket",
              "eyes",
            ],
          },
        },
      },
    },
    draft: {
      description: "Set to true to produce releases in a draft state.",
      type: "boolean",
      default: false,
    },
    generateReleaseNotes: {
      description:
        "Set to true to append automatically generated release notes to the release body.",
      type: "boolean",
      default: false,
    },
    prerelease: {
      description:
        "Set to true or false to override the automatic tag name based pre-release detection.",
      type: "boolean",
    },
    reactions: {
      description: "Reactions to create for releases.",
      type: "array",
      default: [],
      items: {
        description: "A reaction to create for releases.",
        type: "string",
        enum: ["+1", "laugh", "hooray", "heart", "rocket", "eyes"],
      },
    },
  },
};

export const assets = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: ASSETS,
  title: "GitHub Release from Tag (Assets)",
  description: "Assets to be associated with releases.",
  type: "array",
  items: {
    description: "An asset to be associated with releases.",
    type: "object",
    additionalProperties: false,
    required: ["path"],
    properties: {
      label: {
        description: "The asset label.",
        type: "string",
        default: "",
      },
      name: {
        description:
          "The asset name. Defaults to the basename of the asset path.",
        type: "string",
        default: "",
      },
      path: {
        description:
          "The file path glob pattern used to locate the asset(s). " +
          "Relative patterns are resolved against the root of the Git repo.",
        type: "string",
        minLength: 1,
      },
    },
  },
};
