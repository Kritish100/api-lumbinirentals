const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");
const { randomUUID } = require("crypto");
const db = require("./db");

// Keep MIME types in sync with your frontend
const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT || path.join(process.cwd(), "uploads");

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, "properties", req.params.propertyId);
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ACCEPTED_MIME.includes(file.mimetype)) {
      return cb(
        new Error(
          "Unsupported file type. Only images and MP4/MOV/WEBM videos are allowed.",
        ),
      );
    }
    cb(null, true);
  },
});

const router = Router({ mergeParams: true });

router.post("", upload.array("files", 20), async (req, res) => {
  try {
    const { propertyId } = req.params;
    const meta = JSON.parse(req.body.meta || "{}");
    const order = Array.isArray(meta.order) ? meta.order : [];
    const deletedPaths = Array.isArray(meta.deletedPaths)
      ? meta.deletedPaths
      : [];

    const dir = path.join(UPLOAD_ROOT, "properties", propertyId);

    const uploadedPaths = await Promise.all(
      (req.files || []).map(async (file) => {
        const isVideo = file.mimetype.startsWith("video/");
        const publicBasePath = `/uploads/properties/${propertyId}`;

        if (isVideo) {
          // Videos remain untouched
          return `${publicBasePath}/${file.filename}`;
        } else {
          // It's an image: Process it with Sharp directly from the temp disk location
          const webpFilename = `${path.parse(file.filename).name}.webp`;
          const inputAbsolutePath = file.path; // multer's temporary disk path
          const outputAbsolutePath = path.join(dir, webpFilename);
        }
        try {
          await sharp(inputAbsolutePath)
            .rotate() // Auto-correct orientation
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 70 })
            .toFile(outputAbsolutePath);

          // If the converted webp name is different from the original multer filename,
          // delete the heavy raw file left on disk
          if (file.filename !== webpFilename) {
            await fs.unlink(inputAbsolutePath).catch(() => {});
          }

          return `${publicBasePath}/${webpFilename}`;
        } catch (e) {
          console.error(
            "Sharp optimization failed, falling back to original file:",
            sharpErr,
          );
          // Fallback: if optimization fails for any weird edge case, use the raw uploaded file path
          return `${publicBasePath}/${file.filename}`;
        }
      }),
    );

    // // Map newly uploaded files to their public paths
    let cursor = 0;
    const finalAssets = order.map((entry) =>
      typeof entry === "string" && entry.startsWith("NEW:")
        ? uploadedPaths[cursor++]
        : entry,
    );

    // Delete removed files from disk safely
    await Promise.all(
      deletedPaths.map(async (storedPath) => {
        const absolutePath = path.join(
          process.cwd(),
          storedPath.replace(/^\//, ""),
        );
        try {
          await fs.unlink(absolutePath);
        } catch (err) {
          if (err.code !== "ENOENT")
            console.error(`Failed to delete ${storedPath}:`, err);
        }
      }),
    );

    // SQL UPDATE Statement
    const sql = `
      UPDATE properties SET assets = ? WHERE id = ?
    `;

    db.run(sql, [JSON.stringify(finalAssets), propertyId], function (err) {
      if (err)
        return res.status(400).json({ success: false, error: err.message });

      res.status(200).json({
        success: true,
        message: "Assets uploaded successfully",
        assets: finalAssets,
      });
    });
  } catch (err) {
    console.error("Asset save error:", err);
    const status = err instanceof multer.MulterError ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to save assets" });
  }
});

module.exports = router;
