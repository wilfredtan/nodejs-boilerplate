import { Request, Response } from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import s3Client, { bucketName } from '../s3-client';
import ImageModel from '../models/Image';
import { promises as fs } from 'fs';
import path from 'path';
import { createReadStream } from 'fs';

export const downloadImageHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  const image = await ImageModel.findOne({ _id: id, deletedAt: { $exists: false } });
  if (!image) {
    return res.status(404).json({ error: 'Image not found.' });
  }

  // Convert to the expected format
  const imageData = {
    id: image._id.toString(),
    name: image.name,
    size: image.size,
    width: image.width,
    height: image.height,
    fileType: image.fileType,
    s3Key: image.s3Key,
    createdAt: image.createdAt,
    bookmarked: image.bookmarked,
  };

  // Check if this is a local file (starts with 'uploads/')
  if (imageData.s3Key.startsWith('uploads/')) {
    // Local file storage
    const localPath = path.join(process.cwd(), imageData.s3Key);

    // Check if file exists
    await fs.access(localPath);

    // Set headers
    res.setHeader('Content-Type', imageData.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${imageData.name}"`);

    // Stream the file
    const fileStream = createReadStream(localPath);
    fileStream.pipe(res);
  } else {
    // S3 storage
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: imageData.s3Key,
    });

    const { Body, ContentType } = await s3Client.send(getCommand);

    res.setHeader('Content-Type', ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${imageData.name}"`);

    if (Body instanceof Readable) {
      Body.pipe(res);
    } else {
      res.send(Body);
    }
  }
};
