import { create as createGlob } from "@actions/glob";
import { createHash } from "crypto";
import { readFile, stat } from "fs/promises";
import { lookup } from "mime-types";
import { basename } from "path";
import { ErrorFn, GroupFn, InfoFn, WarningFn } from "./type/actions.js";
import { AssetConfig, Config } from "./type/config.js";
import {
  AssetData,
  ReleaseData,
  ReposApi,
  RequestApi,
} from "./type/octokit.js";

export async function modifyReleaseAssets({
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
}: {
  config: Config;
  error: ErrorFn;
  group: GroupFn;
  info: InfoFn;
  owner: string;
  release: ReleaseData;
  repo: string;
  repos: ReposApi;
  request: RequestApi;
  warning: WarningFn;
}): Promise<[boolean, NormalizedAsset[]]> {
  const existingAssets = release.assets;
  const desiredAssets = await findAssets(info, warning, config.assets);

  if (existingAssets.length < 1 && desiredAssets.length < 1) {
    info("No release assets to modify");

    return [true, []];
  }

  return group("Modifying release assets", async () => {
    const { toUpload, toUpdate } = diffAssets(existingAssets, desiredAssets);

    info(`${toUpload.length} to upload, ${toUpdate.length} to update`);

    const [uploadResults, updateResults] = await Promise.all([
      Promise.allSettled(toUpload.map((desired) => uploadAsset(desired))),
      Promise.allSettled(
        toUpdate.map(([existing, desired]) => updateAsset(existing, desired)),
      ),
    ]);

    const uploadResult = analyzeResults(uploadResults);
    const updateResult = analyzeResults(updateResults);

    logResults(
      info,
      error,
      uploadResult,
      "{successCount} uploaded, {failureCount} failed to upload",
    );
    logResults(
      info,
      error,
      updateResult,
      "{successCount} updated, {failureCount} failed to update",
    );

    const sortedAssets = [...uploadResult.assets, ...updateResult.assets].sort(
      compareAsset,
    );

    let checksumsResult: boolean;

    if (config.checksum.generateAssets) {
      checksumsResult = await uploadOrUpdateChecksumAssets(sortedAssets);
    } else {
      checksumsResult = true;
    }

    const isSuccess =
      uploadResult.isSuccess && updateResult.isSuccess && checksumsResult;

    return [isSuccess, sortedAssets];
  });

  async function deleteAsset(existing: AssetData): Promise<void> {
    info(
      `Deleting existing release asset ${JSON.stringify(existing.name)} (${
        existing.id
      })`,
    );

    await repos.deleteReleaseAsset({
      owner,
      repo,
      asset_id: existing.id,
    });
  }

  async function updateAsset(
    existing: AssetData,
    desired: AssetConfig,
  ): Promise<NormalizedAsset> {
    await deleteAsset(existing);

    return uploadAsset(desired);
  }

  async function uploadAsset(desired: AssetConfig): Promise<NormalizedAsset> {
    const { upload_url: url } = release;
    const { label, name, path } = desired;
    const contentType = lookup(path) || "application/octet-stream";
    const data = await readFile(path);
    const sha256 = createHash("sha256").update(data).digest("hex");

    info(
      `Uploading release asset ${JSON.stringify(
        desired.name,
      )} (${contentType})`,
    );

    const { data: assetData } = (await request({
      method: "POST",
      url,
      name,
      data,
      label,
      headers: {
        "Content-Type": contentType,
      },
    })) as { data: AssetData };

    const normalized = normalizeAssetData(assetData, { sha256 });
    info(
      `Uploaded release asset ${JSON.stringify(desired.name)}: ${JSON.stringify(
        normalized,
        null,
        2,
      )}`,
    );

    return normalized;
  }

  async function uploadChecksumAsset(
    name: string,
    contentType: string,
    data: string,
    label: string,
  ): Promise<void> {
    const { upload_url: url } = release;

    info(`Uploading checksum asset ${JSON.stringify(name)}`);

    const { data: assetData } = (await request({
      method: "POST",
      url,
      name,
      data,
      label,
      headers: {
        "Content-Type": contentType,
      },
    })) as { data: AssetData };

    info(`Uploaded checksum asset ${JSON.stringify(name)}`);
  }

  async function uploadOrUpdateChecksumAssets(
    assets: NormalizedAsset[],
  ): Promise<boolean> {
    const sha256sumData = renderChecksumAsset("sha256", assets);
    const jsonData = renderJSONChecksumAsset(assets);

    const results = await Promise.allSettled([
      uploadChecksumAsset(
        "checksums.sha256",
        "text/plain",
        sha256sumData,
        "Checksums (sha256sum)",
      ),
      uploadChecksumAsset(
        "checksums.json",
        "application/json",
        jsonData,
        "Checksums (JSON)",
      ),
    ]);

    return results.every((result) => result.status === "fulfilled");
  }
}

export async function findAssets(
  info: InfoFn,
  warning: WarningFn,
  assets: AssetConfig[],
): Promise<AssetConfig[]> {
  const found = [];
  for (const asset of assets) found.push(...(await findAsset(info, asset)));

  const seen = new Set();

  return found.filter(({ name }) => {
    const lowercaseName = name.toLowerCase();

    if (!seen.has(lowercaseName)) {
      seen.add(lowercaseName);

      return true;
    }

    const quotedName = JSON.stringify(name);
    warning(
      `Release asset ${quotedName} found multiple times. Only the first instance will be used.`,
    );

    return false;
  });
}

async function findAsset(
  info: InfoFn,
  asset: AssetConfig,
): Promise<AssetConfig[]> {
  const { path: pattern, optional: isOptional } = asset;
  const globber = await createGlob(pattern);
  const assets = [];

  for await (const path of globber.globGenerator()) {
    // ignore directories
    const stats = await stat(path);
    if (!stats.isDirectory()) assets.push({ path });
  }

  if (assets.length < 1) {
    const quotedPattern = JSON.stringify(pattern);

    if (isOptional) {
      info(
        `No release assets found for optional asset with path glob pattern ${quotedPattern}`,
      );

      return [];
    }

    throw new Error(
      `No release assets found for mandatory asset with path glob pattern ${quotedPattern}`,
    );
  }

  // name, label, and optional options only apply when the glob matches a single file
  if (assets.length > 1) return assets.map(normalizeAssetConfig);

  const [{ path }] = assets;
  const { name, label, optional } = asset;

  return [normalizeAssetConfig({ label, name, path, optional })];
}

function normalizeAssetConfig({
  label = "",
  path,
  name = "",
  optional = false,
}: {
  label?: string;
  name?: string;
  optional?: boolean;
  path: string;
}): AssetConfig {
  return {
    label,
    name: name || basename(path),
    path,
    optional,
  };
}

function diffAssets(
  existingAssets: AssetData[],
  desiredAssets: AssetConfig[],
): { toUpdate: [AssetData, AssetConfig][]; toUpload: AssetConfig[] } {
  const toUpdate: [AssetData, AssetConfig][] = [];
  const toUpload: AssetConfig[] = [];

  for (const desired of desiredAssets) {
    const existing = existingAssets.find(
      (existing) => existing.name === desired.name,
    );

    if (existing == null) {
      toUpload.push(desired);
    } else {
      toUpdate.push([existing, desired]);
    }
  }

  return {
    toUpdate,
    toUpload,
  };
}

function renderChecksumAsset(
  type: keyof AssetChecksums,
  assets: NormalizedAsset[],
): string {
  return (
    assets.map((asset) => `${asset.checksum[type]}  ${asset.name}`).join("\n") +
    "\n"
  );
}

function renderJSONChecksumAsset(assets: NormalizedAsset[]): string {
  return (
    JSON.stringify(
      {
        sha256: Object.fromEntries(
          assets.map((asset) => [asset.name, asset.checksum.sha256]),
        ),
      },
      null,
      2,
    ) + "\n"
  );
}

type ResultAnalysis = {
  isSuccess: boolean;
  successCount: number;
  assets: NormalizedAsset[];
  failureCount: number;
  failureReasons: Error[];
};

function analyzeResults(
  results: PromiseSettledResult<NormalizedAsset>[],
): ResultAnalysis {
  let isSuccess = true;
  let successCount = 0;
  const assets: NormalizedAsset[] = [];
  let failureCount = 0;
  const failureReasons: Error[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      ++successCount;
      assets.push(result.value);
    } else {
      isSuccess = false;
      ++failureCount;
      failureReasons.push(result.reason);
    }
  }

  return {
    isSuccess,
    successCount,
    assets,
    failureCount,
    failureReasons,
  };
}

async function logResults(
  info: InfoFn,
  error: ErrorFn,
  resultAnalysis: ResultAnalysis,
  messageTemplate: string,
): Promise<void> {
  const { successCount, failureCount, failureReasons } = resultAnalysis;
  const message = messageTemplate
    .replace("{successCount}", successCount.toString())
    .replace("{failureCount}", failureCount.toString());

  if (failureCount > 0) {
    info(`${message}:`);
    for (const reason of failureReasons) error(reason.stack ?? "");
    info("");
  } else {
    info(message);
  }
}

type NormalizedAsset = {
  apiUrl: AssetData["url"];
  downloadUrl: AssetData["browser_download_url"];
  id: AssetData["id"];
  nodeId: AssetData["node_id"];
  name: AssetData["name"];
  label: AssetData["label"];
  state: AssetData["state"];
  contentType: AssetData["content_type"];
  size: AssetData["size"];
  downloadCount: AssetData["download_count"];
  createdAt: AssetData["created_at"];
  updatedAt: AssetData["updated_at"];
  checksum: AssetChecksums;
};

type AssetChecksums = {
  sha256: string;
};

function normalizeAssetData(
  data: AssetData,
  checksum: AssetChecksums,
): NormalizedAsset {
  const {
    url: apiUrl,
    browser_download_url: downloadUrl,
    id,
    node_id: nodeId,
    name,
    label,
    state,
    content_type: contentType,
    size,
    download_count: downloadCount,
    created_at: createdAt,
    updated_at: updatedAt,
  } = data;

  return {
    apiUrl,
    downloadUrl,
    id,
    nodeId,
    name,
    label,
    state,
    contentType,
    size,
    downloadCount,
    createdAt,
    updatedAt,
    checksum,
  };
}

function compareAsset(a: NormalizedAsset, b: NormalizedAsset): number {
  return a.name.localeCompare(b.name);
}
