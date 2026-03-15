import fs from "fs";
import path from "path";

type UploadCategory = "profiles" | "feed" | "accounting";

interface UploadResult {
  url: string;
  fileType: string;
}

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

const CATEGORY_CONFIG: Record<UploadCategory, { mimeTypes: Set<string>; extensions: Set<string> }> = {
  profiles: {
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]),
  },
  feed: {
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]),
  },
  accounting: {
    mimeTypes: new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]),
    extensions: new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx"]),
  },
};

export function getUploadsRootPath(): string {
  return UPLOADS_ROOT;
}

export function ensureUploadsRoot(): void {
  if (!fs.existsSync(UPLOADS_ROOT)) {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  }
}

function ensureCategoryDirectory(category: UploadCategory): string {
  ensureUploadsRoot();
  const categoryDir = path.join(UPLOADS_ROOT, category);
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }
  return categoryDir;
}

function normalizeExtension(fileName: string): string {
  return path.extname(fileName || "").toLowerCase();
}

function sanitizeBaseName(fileName: string): string {
  const base = path.basename(fileName, path.extname(fileName));
  return (base || "file").toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 60);
}

function validateFileType(category: UploadCategory, fileName: string, mimeType: string): string {
  const extension = normalizeExtension(fileName);
  const config = CATEGORY_CONFIG[category];

  if (!config.extensions.has(extension) || !config.mimeTypes.has(mimeType)) {
    throw new Error("Unsupported file type");
  }

  return extension;
}

export async function saveUploadedFile(
  file: Express.Multer.File,
  category: UploadCategory,
): Promise<UploadResult> {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error("Uploaded file is invalid");
  }

  const extension = validateFileType(category, file.originalname, file.mimetype);
  const baseName = sanitizeBaseName(file.originalname);
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${baseName}${extension}`;
  const categoryDir = ensureCategoryDirectory(category);
  const absolutePath = path.join(categoryDir, uniqueName);

  await fs.promises.writeFile(absolutePath, file.buffer);

  return {
    url: `/uploads/${category}/${uniqueName}`,
    fileType: file.mimetype,
  };
}
