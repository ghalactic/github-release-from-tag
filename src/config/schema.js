export const schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://lqnt.co/github-release-action/config.schema.json',
  title: 'GitHub Release from Tag Configuration File',
  description: 'The configuration file used by the "GitHub Release from Tag" GitHub Action.',
  type: 'object',
  additionalProperties: false,
  properties: {
    assets: {
      description: 'Assets to be associated with releases.',
      type: 'array',
      default: [],
      items: {
        description: 'An asset to be associated with releases.',
        type: 'object',
        additionalProperties: false,
        required: [
          'path',
        ],
        properties: {
          label: {
            description: 'The asset label.',
            type: 'string',
            minLength: 1,
          },
          name: {
            description: 'The asset name. Defaults to the basename of the asset path.',
            type: 'string',
            minLength: 1,
          },
          path: {
            description: 'The path to an asset. Relative paths are resolved against the root of the Git repo.',
            type: 'string',
            minLength: 1,
          },
        },
      },
    },
    discussion: {
      description: 'If specified, a discussion is created and linked to the release.',
      type: 'object',
      additionalProperties: false,
      required: [
        'category',
      ],
      properties: {
        category: {
          description: 'The category to use when creating the discussion. The value must be a category that already exists in the repository.',
          type: 'string',
        },
      },
    },
    draft: {
      description: 'Set to true to produce releases in a draft state.',
      type: 'boolean',
      default: false,
    },
    generateReleaseNotes: {
      description: 'Set to "true" to append automatically generated release notes to the release body.',
      type: 'boolean',
      default: false,
    },
    reactions: {
      description: 'Reactions to create for releases.',
      type: 'array',
      default: [],
      items: {
        description: 'A reaction to create for releases.',
        type: 'string',
        enum: [
          '+1',
          'laugh',
          'hooray',
          'heart',
          'rocket',
          'eyes',
        ],
      },
    },
  },
}
