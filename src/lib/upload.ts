import "server-only";
import sharp from "sharp";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

const cloudinaryReady = () => !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

/**
 * Compresses an uploaded image (max 1600px, WebP q82, EXIF stripped) and stores it
 * on Cloudinary, or in /public/uploads during local development.
 */
export async function storeImage(file: File, folder = "products") {
  const input = Buffer.from(await file.arrayBuffer());
  const img = sharp(input, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const isSvg = meta.format === "svg";
  const out = isSvg ? input : await img.resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: false });
  const dims = isSvg ? meta : await sharp(out).metadata();

  if (cloudinaryReady()) {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
    const res = await new Promise<{ secure_url: string; public_id: string; width: number; height: number }>((resolve, reject) =>
      cloudinary.uploader.upload_stream({ folder: `skinora/${folder}`, resource_type: "image" }, (err, r) => (err || !r ? reject(err) : resolve(r as never))).end(out),
    );
    return { url: res.secure_url, publicId: res.public_id, width: res.width, height: res.height, bytes: out.length, originalBytes: input.length };
  }

  const name = `${randomUUID()}.${isSvg ? "svg" : "webp"}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), out);
  return { url: `/uploads/${folder}/${name}`, publicId: null, width: dims.width ?? null, height: dims.height ?? null, bytes: out.length, originalBytes: input.length };
}

export async function deleteImage(publicId: string | null) {
  if (!publicId || !cloudinaryReady()) return;
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
  await cloudinary.uploader.destroy(publicId).catch(() => {});
}
