// controllers/uploadController.js
const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

exports.uploadImageToGCS = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const file = bucket.file(fileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.on("error", (err) => {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    });

    stream.on("finish", async () => {
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
      res.json({ imageUrl: publicUrl });
    });

    stream.end(req.file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// Multiple Files Upload
exports.uploadMultipleImagesToGCS = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        const gcsFile = bucket.file(fileName);

        const stream = gcsFile.createWriteStream({
          metadata: { contentType: file.mimetype },
        });

        return new Promise((resolve, reject) => {
          stream.on("error", (err) => {
            console.error(err);
            reject(`Upload failed for ${file.originalname}`);
          });

          stream.on("finish", async () => {
            await gcsFile.makePublic();
            resolve({
              imageUrl: `https://storage.googleapis.com/${bucketName}/${fileName}`,
              fileName,
            });
          });

          stream.end(file.buffer);
        });
      })
    );

    res.json({ images: uploadedFiles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete File
exports.deleteImageFromGCS = async (req, res) => {
  function extractFileName(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split("/").pop();
    } catch (error) {
      console.error("Invalid URL:", error);
      return null;
    }
  }

  try {
    const { fileName } = req.body; // File name from request body

    if (!fileName) {
      return res.status(400).json({ error: "File name is required" });
    }

    const file = bucket.file(extractFileName(fileName));

    // Check if file exists before deleting
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: "File not found" });
    }

    await file.delete();
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
