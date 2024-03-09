import {
  DISCUSSION_REACTIONS,
  RELEASE_REACTIONS,
} from "../constant/reaction.js";
import { ASSETS, CONFIG } from "../constant/schema-id.js";

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
    checksum: {
      description: "Options for release asset checksums.",
      type: "object",
      additionalProperties: false,
      default: {},
      properties: {
        generateAssets: {
          description:
            "Set to false to disable generation of checksum assets for releases.",
          type: "boolean",
          default: true,
        },
      },
    },
    discussion: {
      description: "Options for creating discussions linked to releases.",
      type: "object",
      additionalProperties: false,
      default: {},
      properties: {
        category: {
          description:
            "The category to use when creating the discussion. " +
            "The value must be a category that already exists in the repository.",
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
            enum: DISCUSSION_REACTIONS,
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
        "Set to true to append automatically generated release notes to release bodies.",
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
        enum: RELEASE_REACTIONS,
      },
    },
    summary: {
      description: "Options for creating GitHub Actions job summaries.",
      type: "object",
      additionalProperties: false,
      default: {},
      properties: {
        enabled: {
          description:
            "Set to false to disable GitHub Actions job summary creation.",
          type: "boolean",
          default: true,
        },
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
      optional: {
        description:
          "Whether the asset should be ignored if the path file glob pattern does not match any files.",
        type: "boolean",
        default: false,
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
