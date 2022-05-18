import {create as createGlob} from '@actions/glob'
import {readFile, stat} from 'fs/promises'
import {lookup} from 'mime-types'
import {basename} from 'path'

export async function modifyReleaseAssets ({
  config,
  error,
  group,
  info,
  owner,
  release,
  repo,
  repos,
  request,
  warning,
}) {
  const existingAssets = release.assets
  const foundAssets = await findAssets(config.assets)
  const seenAssets = new Set()

  const desiredAssets = foundAssets.filter(({name}) => {
    if (!seenAssets.has(name)) {
      seenAssets.add(name)

      return true
    }

    warning(`Release asset ${JSON.stringify(name)} appears multiple times. Only the first definition will be used.`)

    return false
  })

  if (existingAssets.length < 1 && desiredAssets.length < 1) {
    info('No release assets to modify')

    return true
  }

  return group('Modifying release assets', async () => {
    const {toUpload, toUpdate} = diffAssets(existingAssets, desiredAssets)

    info(`${toUpload.length} to upload, ${toUpdate.length} to update`)

    const [
      uploadResults,
      updateResults,
    ] = await Promise.all([
      Promise.allSettled(toUpload.map(desired => uploadAsset(desired))),
      Promise.allSettled(toUpdate.map(([existing, desired]) => updateAsset(existing, desired))),
    ])

    const uploadResult = analyzeResults(uploadResults)
    const updateResult = analyzeResults(updateResults)

    logResults(info, error, uploadResult, '{successCount} uploaded, {failureCount} failed to upload')
    logResults(info, error, updateResult, '{successCount} updated, {failureCount} failed to update')

    return (
      uploadResult.isSuccess &&
      updateResult.isSuccess
    )
  })

  async function deleteAsset (existing) {
    info(`Deleting existing release asset ${JSON.stringify(existing.name)} (${existing.id})`)

    await repos.deleteReleaseAsset({
      owner,
      repo,
      asset_id: existing.id,
    })
  }

  async function updateAsset (existing, desired) {
    await deleteAsset(existing)
    await uploadAsset(desired)
  }

  async function uploadAsset (desired) {
    const {upload_url: url} = release
    const {label, name, path} = desired
    const contentType = lookup(path)
    const data = await readFile(path)

    info(`Uploading release asset ${JSON.stringify(desired.name)} (${contentType})`)

    await request({
      method: 'POST',
      url,
      name,
      data,
      label,
      headers: {
        'Content-Type': contentType,
      },
    })
  }
}

export async function findAssets (assets) {
  const desired = []
  for (const asset of assets) desired.push(...await findAsset(asset))

  return desired
}

async function findAsset (asset) {
  const {path: pattern} = asset
  const globber = await createGlob(pattern)
  const assets = []

  for await (const path of globber.globGenerator()) {
    // ignore directories
    const stats = await stat(path)
    if (!stats.isDirectory()) assets.push({path})
  }

  if (assets.length < 1) throw new Error(`No release assets found for path ${JSON.stringify(pattern)}`)

  // name and label options only apply when the glob matches a single file
  if (assets.length > 1) return assets.map(normalizeAsset)

  const [{path}] = assets
  const {name, label} = asset

  return [normalizeAsset({label, name, path})]
}

function normalizeAsset (asset) {
  const {
    label = '',
    path,
  } = asset

  const {
    name = basename(path),
  } = asset

  return {
    label,
    name,
    path,
  }
}

function diffAssets (existingAssets, desiredAssets) {
  const toUpdate = []
  const toUpload = []

  for (const desired of desiredAssets) {
    const existing = existingAssets.find(existing => existing.name === desired.name)

    if (existing == null) {
      toUpload.push(desired)
    } else {
      toUpdate.push([existing, desired])
    }
  }

  return {
    toUpdate,
    toUpload,
  }
}

function analyzeResults (results) {
  let isSuccess = true
  let successCount = 0
  let failureCount = 0
  const failureReasons = []

  for (const {status, reason} of results) {
    if (status === 'fulfilled') {
      ++successCount
    } else {
      isSuccess = false
      ++failureCount
      failureReasons.push(reason)
    }
  }

  return {
    isSuccess,
    successCount,
    failureCount,
    failureReasons,
  }
}

async function logResults (info, error, result, messageTemplate) {
  const {successCount, failureCount, failureReasons} = result
  const message = messageTemplate
    .replace('{successCount}', successCount)
    .replace('{failureCount}', failureCount)

  if (failureCount > 0) {
    info(`${message}:`)
    for (const reason of failureReasons) error(reason.stack)
    info('')
  } else {
    info(message)
  }
}
