import type { StagedUploadAsset, UploadAsset } from "@/types";

const STAGED_UPLOAD_TTL_MS = 1000 * 60 * 30;

type StagedUploadRecord = StagedUploadAsset & {
  stagedAt: number;
};

const uploadStore = globalThis as typeof globalThis & {
  __rentalShieldUploadStore?: Map<string, StagedUploadRecord>;
};

const stagedUploads = uploadStore.__rentalShieldUploadStore ?? new Map<string, StagedUploadRecord>();

if (!uploadStore.__rentalShieldUploadStore) {
  uploadStore.__rentalShieldUploadStore = stagedUploads;
}

function purgeExpiredUploads(now = Date.now()) {
  for (const [id, record] of stagedUploads.entries()) {
    if (now - record.stagedAt > STAGED_UPLOAD_TTL_MS) {
      stagedUploads.delete(id);
    }
  }
}

export async function stageUploadedFiles(files: File[]): Promise<UploadAsset[]> {
  purgeExpiredUploads();

  const stagedAssets: UploadAsset[] = [];

  for (const file of files) {
    const id = crypto.randomUUID();
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    stagedUploads.set(id, {
      id,
      name: file.name,
      contentType: file.type,
      size: file.size,
      base64Data,
      stagedAt: Date.now(),
    });

    stagedAssets.push({
      id,
      name: file.name,
      contentType: file.type,
      size: file.size,
    });
  }

  return stagedAssets;
}

export function resolveStagedUploads(assets: UploadAsset[]): StagedUploadAsset[] {
  purgeExpiredUploads();

  return assets
    .map((asset) => stagedUploads.get(asset.id))
    .filter((asset): asset is StagedUploadRecord => Boolean(asset))
    .map(({ stagedAt: _stagedAt, ...asset }) => asset);
}
