export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PHOTOS_PER_COMPLAINT = 5;

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

export function validatePhotoFiles(
  files: Array<{ name: string; size: number; type: string }>,
  existingCount = 0
): PhotoValidationResult {
  const totalCount = existingCount + files.length;
  if (totalCount > MAX_PHOTOS_PER_COMPLAINT) {
    return {
      valid: false,
      error: `You can upload a maximum of ${MAX_PHOTOS_PER_COMPLAINT} photos per complaint (currently ${totalCount}).`,
    };
  }

  for (const file of files) {
    const res = validatePhotoFile(file);
    if (!res.valid) {
      return {
        valid: false,
        error: `${file.name}: ${res.error}`,
      };
    }
  }

  return { valid: true };
}

