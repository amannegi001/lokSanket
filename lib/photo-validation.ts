export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePhotoFile(file: {
  name: string;
  size: number;
  type: string;
}): PhotoValidationResult {
  if (!file) {
    return { valid: false, error: "No file provided." };
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: "File size exceeds 5 MB limit. Please select a smaller photo.",
    };
  }

  const nameLower = (file.name || "").toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error:
        "Unsupported file format. Only JPG, JPEG, PNG, and WEBP images are accepted.",
    };
  }

  return { valid: true };
}
