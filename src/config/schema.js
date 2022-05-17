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
  },
}
