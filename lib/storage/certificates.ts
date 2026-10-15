import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

let client: S3Client | undefined;

function getStorageConfig() {
  const endpoint = process.env.LIARA_OBJECT_STORAGE_ENDPOINT;
  const bucket = process.env.LIARA_OBJECT_STORAGE_BUCKET;
  const accessKeyId = process.env.LIARA_OBJECT_STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.LIARA_OBJECT_STORAGE_SECRET_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Liara Object Storage is not fully configured");
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

function getClient(config: ReturnType<typeof getStorageConfig>) {
  client ??= new S3Client({
    endpoint: config.endpoint,
    region: process.env.LIARA_OBJECT_STORAGE_REGION ?? "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return client;
}

export async function uploadCertificate(file: Buffer, contentType: string, originalName: string) {
  const config = getStorageConfig();
  const extension = (originalName.split(".").pop() || "bin")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10)
    .toLowerCase() || "bin";
  const path = `certificates/${randomUUID()}.${extension}`;
  await getClient(config).send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: path,
    Body: file,
    ContentType: contentType,
  }));

  return { path };
}

export async function downloadCertificate(path: string) {
  const config = getStorageConfig();
  const result = await getClient(config).send(new GetObjectCommand({ Bucket: config.bucket, Key: path }));
  if (!result.Body) throw new Error("Certificate object is empty");
  return { body: await result.Body.transformToByteArray(), contentType: result.ContentType ?? "application/pdf" };
}
