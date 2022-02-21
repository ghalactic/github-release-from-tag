import {getExecOutput} from '@actions/exec'

let emptyTreeHash

export async function readEmptyTreeHash () {
  if (emptyTreeHash == null) {
    const {stdout} = await getExecOutput('git', ['hash-object', '-t', 'tree', '/dev/null'], {silent: true})
    emptyTreeHash = stdout.trim()
  }

  return emptyTreeHash
}
