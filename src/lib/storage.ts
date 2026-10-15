import "server-only";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Works with any S3-compatible store. Recommended: Cloudflare R2 (no download fees).
//   R2:  S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com  S3_REGION=auto
//   AWS: leave S3_ENDPOINT empty and set S3_REGION, e.g. ap-southeast-2

export function storageConfigured() {
  return Boolean(
    process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
  );
}

let client: S3Client | null = null;
function s3() {
  client ??= new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
    // Newer SDKs add checksum headers to every upload, which browsers can't
    // send on presigned URLs and R2 rejects. Only use them when required.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

const bucket = () => process.env.S3_BUCKET ?? "";

/** Files at or below this size go up in one request; bigger ones in parts. */
export const SINGLE_UPLOAD_LIMIT = 100 * 1024 * 1024;
const MIN_PART_SIZE = 64 * 1024 * 1024;
const MAX_PARTS = 10_000;

export function partSizeFor(size: number) {
  return Math.max(MIN_PART_SIZE, Math.ceil(size / MAX_PARTS));
}

export async function presignPut(key: string, contentType: string) {
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), {
    expiresIn: 60 * 60,
  });
}

export async function startMultipart(key: string, contentType: string, size: number) {
  const res = await s3().send(
    new CreateMultipartUploadCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
  );
  if (!res.UploadId) throw new Error("Storage did not return an upload id");
  const partSize = partSizeFor(size);
  const partCount = Math.ceil(size / partSize);
  const urls = await Promise.all(
    Array.from({ length: partCount }, (_, i) =>
      getSignedUrl(
        s3(),
        new UploadPartCommand({ Bucket: bucket(), Key: key, UploadId: res.UploadId, PartNumber: i + 1 }),
        { expiresIn: 6 * 60 * 60 },
      ),
    ),
  );
  return { uploadId: res.UploadId, partSize, urls };
}

export async function completeMultipart(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
) {
  await s3().send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: [...parts]
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    }),
  );
}

export async function abortMultipart(key: string, uploadId: string) {
  await s3().send(new AbortMultipartUploadCommand({ Bucket: bucket(), Key: key, UploadId: uploadId }));
}

export async function objectSize(key: string): Promise<number | null> {
  try {
    const res = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return res.ContentLength ?? null;
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function presignDownload(key: string, fileName: string, inline: boolean) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  const disposition = `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: disposition }),
    { expiresIn: 15 * 60 },
  );
}
