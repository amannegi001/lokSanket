import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { connectDB } from "@/lib/db";
export {
  MAX_PHOTO_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  validatePhotoFile,
  type PhotoValidationResult,
} from "@/lib/photo-validation";

export async function storePhotoInGridFS(file: File): Promise<{
  fileId: string;
  filename: string;
  url: string;
}> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB database connection is not available for GridFS.");
  }

  const bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: "photos",
  });

  const rawName = file.name || "evidence.jpg";
  const sanitizedFilename =
    rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "evidence.jpg";

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";

  const uploadStream = bucket.openUploadStream(sanitizedFilename, {
    metadata: {
      contentType: mimeType,
      originalName: file.name,
      size: file.size,
      uploadedAt: new Date(),
    },
  });

  await new Promise<void>((resolve, reject) => {
    uploadStream.on("finish", () => resolve());
    uploadStream.on("error", (err) => reject(err));
    uploadStream.end(buffer);
  });

  const fileId = uploadStream.id.toString();
  const url = `/api/photos/${fileId}/${sanitizedFilename}`;

  return { fileId, filename: sanitizedFilename, url };
}

function getMimeTypeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function getPhotoFromGridFS(fileId: string): Promise<{
  stream: NodeJS.ReadableStream;
  contentType: string;
  length: number;
  filename: string;
} | null> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB database connection is not available for GridFS.");
  }

  if (!ObjectId.isValid(fileId)) {
    return null;
  }

  const bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: "photos",
  });

  const objId = new ObjectId(fileId);
  const files = await bucket.find({ _id: objId }).toArray();
  if (!files || files.length === 0) {
    return null;
  }

  const fileDoc = files[0];
  const downloadStream = bucket.openDownloadStream(objId);

  // Type-safe extraction of content type from metadata or filename extension
  const metadata = fileDoc.metadata as Record<string, unknown> | undefined;
  const contentType =
    (metadata?.contentType as string) ||
    getMimeTypeFromFilename(fileDoc.filename);

  return {
    stream: downloadStream,
    contentType,
    length: fileDoc.length,
    filename: fileDoc.filename,
  };
}
