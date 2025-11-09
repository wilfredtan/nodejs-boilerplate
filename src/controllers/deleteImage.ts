import ImageModel from '../models/Image';
import s3Client, { bucketName } from '../s3-client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { isLocal } from '../utils/storage';

export const deleteImageResolver = async (_: any, { id }: { id: string }) => {
  // First get the image to know where it's stored
  const image = await ImageModel.findOne({ _id: id, deletedAt: { $exists: false } });
  if (!image) {
    throw new Error('Image not found or could not be deleted');
  }

  // Delete from storage
  if (isLocal()) {
    // Delete from local storage
    const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
    const filePath = path.join(uploadsDir, path.basename(image.s3Key));
    await fs.promises.unlink(filePath);
  } else {
    // Delete from S3
    if (bucketName) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: image.s3Key,
      });
      await s3Client.send(deleteCommand);
    }
  }

  // Soft delete from database (set deletedAt timestamp)
  await ImageModel.findByIdAndUpdate(id, { deletedAt: new Date() });

  return { success: true, id };
};
