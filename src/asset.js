import {readFile} from 'fs/promises'
import {lookup} from 'mime-types'
import {basename} from 'path'

export async function modifyReleaseAssets ({
  config,
  error,
  group,
  info,
  release,
  repos,
}) {
  const existingAssets = release.assets
  const desiredAssets = config.assets.map(normalizeAsset)

  if (existingAssets.length < 1 && desiredAssets.length < 1) {
    info('No release assets to modify')

    return true
  }

  return group('Modifying release assets', async () => {
    const {toUpload, toUpdate, toDelete} = diffAssets(existingAssets, desiredAssets)

    info(`${toUpload.length} to upload, ${toUpdate.length} to update, ${toDelete.length} to delete`)

    const [
      uploadResults,
      updateResults,
      deleteResults,
    ] = await Promise.all([
      Promise.allSettled(toUpload.map(desired => uploadAsset(repos, release, desired))),
      Promise.allSettled(toUpdate.map(([existing, desired]) => updateAsset(repos, release, existing, desired))),
      Promise.allSettled(toDelete.map(existing => deleteAsset(repos, release, existing))),
    ])

    const uploadResult = analyzeResults(uploadResults)
    const updateResult = analyzeResults(updateResults)
    const deleteResult = analyzeResults(deleteResults)

    logResults(info, error, uploadResult, '{successCount} uploaded, {failureCount} failed to upload')
    logResults(info, error, updateResult, '{successCount} updated, {failureCount} failed to update')
    logResults(info, error, deleteResult, '{successCount} deleted, {failureCount} failed to delete')

    return (
      uploadResult.isSuccess &&
      updateResult.isSuccess &&
      deleteResult.isSuccess
    )
  })
}

async function deleteAsset (repos, release, existing) {
  const {owner, repo} = release

  await repos.deleteReleaseAsset({
    owner,
    repo,
    asset_id: existing.id,
  })
}

async function updateAsset (repos, release, existing, desired) {
  await deleteAsset(repos, release, existing)
  await uploadAsset(repos, release, desired)
}

async function uploadAsset (repos, release, desired) {
  const {owner, repo, id: releaseId} = release
  const {name, path} = desired
  const contentType = lookup(path)
  const data = await readFile(path)

  await repos.post.uploadReleaseAsset({
    owner,
    repo,
    release_id: releaseId,
    name,
    data,
    headers: {
      'Content-Type': contentType,
    },
  })
}

function normalizeAsset (asset) {
  const {path} = asset

  return {
    name: basename(path),
    path,
  }
}

function diffAssets (existingAssets, desiredAssets) {
  const toDelete = []
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

  for (const existing of existingAssets) {
    const isDesired = desiredAssets.some(desired => desired.name === existing.name)

    if (!isDesired) toDelete.push(existing)
  }

  return {
    toDelete,
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
    for (const reason of failureReasons) error(String(reason))
    info('')
  } else {
    info(message)
  }
}
