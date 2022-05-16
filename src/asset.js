import {readFile} from 'fs/promises'
import {lookup} from 'mime-types'
import {basename} from 'path'

export async function modifyReleaseAssets ({
  config,
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

    info(`${uploadResult.successCount} uploaded, ${uploadResult.failureCount} failed to upload`)
    info(`${updateResult.successCount} updated, ${updateResult.failureCount} failed to update`)
    info(`${deleteResult.successCount} deleted, ${deleteResult.failureCount} failed to delete`)

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
  const {owner, repo} = release
  const {name, path} = desired
  const contentType = lookup(path)
  const data = await readFile(path)

  await repos.post.updateReleaseAsset({
    owner,
    repo,
    asset_id: existing.id,
    name,
    data,
    headers: {
      'Content-Type': contentType,
    },
  })
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

  for (const {status} of results) {
    if (status === 'fulfilled') {
      ++successCount
    } else {
      ++failureCount
      isSuccess = false
    }
  }

  return {
    isSuccess,
    successCount,
    failureCount,
  }
}
