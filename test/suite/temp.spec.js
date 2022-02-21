import {createOrphanBranchForCi} from '../helpers/octokit.js'

describe('Temporary', () => {
  it('should be able to create branches', async () => {
    console.log(await createOrphanBranchForCi('a'))
    console.log(await createOrphanBranchForCi('b'))
  })
})
