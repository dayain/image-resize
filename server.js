import { createWriteStream } from "fs";
import { Readable } from "stream";
import sharp from "sharp";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import env from "dotenv";
env.config();

const bucketName = process.env.BUCKET_NAME || "unkown-bucket";
const bucketRegion = process.env.BUCKET_REGION || "unkown-region";
const bucketAccessKey = process.env.BUCKET_ACCESS_KEY || "unkown-access-key";
const bucketSecretKey = process.env.BUCKET_SECRET_KEY || "unkown-secret-key";

const client = new S3Client({
  region: bucketRegion,
  credentials: {
    accessKeyId: bucketAccessKey,
    secretAccessKey: bucketSecretKey,
  },
});

(async () => {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    MaxKeys: 10,
  });

  try {
    let isTruncated = true;

    console.log("Your bucket contains the following objects:\n");
    let contents = "";

    while (isTruncated) {
      const { Contents, IsTruncated, NextContinuationToken } =
        await client.send(command);
      Contents.forEach((c) => resizeImage(c.Key, c.Size));
      isTruncated = IsTruncated;
      command.input.ContinuationToken = NextContinuationToken;
    }
    // console.log(contents);
  } catch (err) {
    console.error(err);
  }
})();

const resizeImage = async (imageKey, size) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: imageKey,
  });
  try {
    const response = await client.send(command);
    // Testing
    // storing original image from s3 to download folder
    const s3ImageDownloadPath = `./download/${imageKey}`;
    const resizedImagePath = `./resized/${imageKey}`;
    await response.Body.pipe(createWriteStream(s3ImageDownloadPath));

    const image = await response.Body.transformToByteArray();
    //TODO write custom code as per requirement to check size and use configured size instead of hard coded 400
    const resizedImage = await sharp(image)
      .resize({ fit: sharp.fit.contain, width: 400 })
      .jpeg({ quality: 80 })
      .toBuffer();
    // Testing
    // storing resized image to resized folder
    const resizeStream = Readable.from(resizedImage);
    resizeStream.pipe(createWriteStream(resizedImagePath));
  } catch (err) {
    console.error(err);
  }
};
