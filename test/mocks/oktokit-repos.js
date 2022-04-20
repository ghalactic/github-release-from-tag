export function createAlreadyExistsError () {
  const error = new Error('Already exists')

  error.response = {
    data: {
      errors: [
        {resource: 'resource-a', code: 'code-a'},
        {resource: 'Release', code: 'already_exists'},
        {resource: 'resource-b', code: 'code-b'},
      ],
    },
  }

  return error
}

export function createRepos ({
  createReleaseError,
  getReleaseByTagError,
  updateReleaseError,
} = {}) {
  return {
    async createRelease (data) {
      if (createReleaseError) throw createReleaseError

      return {data}
    },

    async getReleaseByTag ({owner, repo, tag}) {
      if (getReleaseByTagError) throw getReleaseByTagError

      return {data: {id: `${owner}.${repo}.${tag}`}}
    },

    async updateRelease (data) {
      if (updateReleaseError) throw updateReleaseError

      return {data}
    },
  }
}
