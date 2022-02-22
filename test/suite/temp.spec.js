import {createOrphanBranchForCi} from '../helpers/octokit.js'

describe('Temporary', () => {
  it('should be able to create branches', async () => {
    console.log(JSON.stringify(await createOrphanBranchForCi('a'), null, 2))
    console.log(JSON.stringify(await createOrphanBranchForCi('b'), null, 2))
  })
})
