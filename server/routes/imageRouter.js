const { Router } = require("express");
const imageRouter = Router();
const Image = require("../models/Image");
const { upload } = require("../middleware");
const fs = require("fs");
const { promisify } = require("util");
const mongoose = require("mongoose");
const { s3, getSignedUrl } = require("../aws");
const { v4: uuid } = require("uuid");
const mime = require("mime-types");

// const fileUnlink = promisify(fs.unlink);

imageRouter.post("/presigned", async (req, res) => {
  try {
    if (!req.user) throw new Error("권한이 없습니다.");
    const { contentTypes } = req.body;
    if (!Array.isArray(contentTypes)) throw new Error("invalid contentTypes");
    const presignedData = await Promise.all(
      contentTypes.map(async (contentType) => {
        const imageKey = `${uuid()}.${mime.extension(contentType)}`;
        const key = `raw/${imageKey}`;
        const presigned = await getSignedUrl({ key });
        return { imageKey, presigned };
      })
    );
    return presignedData;
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: err.message });
  }
});

imageRouter.post("/", upload.array("image", 30), async (req, res) => {
  try {
    if (!req.user) throw new Error("권한이 없습니다");
    const { images, public } = req.body;
    const imageDocs = await Promise.all(
      images.map(
        (image) =>
          new Image({
            key: image.imageKey,
            originalFileName: image.originalFileName,
          })
      )
    );

    res.json(imageDocs);
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: err.message });
  }
});

imageRouter.get("/", async (req, res) => {
  try {
    const { lastid } = req.query;
    if (lastid && !mongoose.isValidObjectId(lastid))
      throw new Error("invalid lastid");
    const images = await Image.find().sort({ _id: -1 }).limit(30);
    res.json(images);
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: err.message });
  }
});

imageRouter.delete("/:imageId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.imageId))
      throw new Error("invalid object id");
    const image = await Image.findOneAndDelete({ _id: req.params.imageId });
    if (!image) return res.json({ message: "can not find such id" });
    // await fileUnlink(`./uploads/${image.key}`);
    s3.deleteObject(
      {
        Bucket: "image-upload-tutorial",
        Key: `raw/${image.key}`,
      },
      (error) => {
        if (error) throw error;
      }
    );
    res.json({ message: "requested image deleted" });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: err.message });
  }
});

imageRouter.post("/images", upload.single("image"), async (req, res) => {
  const image = await new Image({
    key: req.file.filename,
    originalFileName: req.file.originalFileName,
  }).save();
  res.json(image);
});

imageRouter.get("/images", async (req, res) => {
  const images = await Image.find();
  res.json(images);
});

module.exports = { imageRouter };
