import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3Client, { bucketName } from '../s3-client';
import { addImage, ImageMetadata } from '../metadata';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { isLocal } from '../utils/storage';

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validateImage = async (buffer: Buffer): Promise<ValidationResult> => {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Check format
  if (!['jpeg', 'png'].includes(metadata.format || '')) {
    return { valid: false, error: 'Invalid image format. Only JPEG and PNG are allowed.' };
  }

  // Check dimensions
  const { width = 0, height = 0 } = metadata;
  if (width < 100 || height < 50) {
    return { valid: false, error: 'Image dimensions too small. Minimum 100x50 pixels.' };
  }

  // Check aspect ratio >= 2:1
  const aspectRatio = width / height;
  if (aspectRatio < 2) {
    return { valid: false, error: 'Aspect ratio must be at least 2:1.' };
  }

  return { valid: true };
};

const ensureUploadsDirectory = async (dirPath: string): Promise<void> => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

export const uploadImage = async (
  file: MulterFile
): Promise<ImageMetadata> => {
  const id = uuidv4();
  const fileName = `${id}-${file.originalname}`;

  if (isLocal()) {
    // Local file storage
    const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
    await ensureUploadsDirectory(uploadsDir);
    const filePath = path.join(uploadsDir, fileName);

    // Write file to local storage
    await fs.writeFile(filePath, file.buffer);

    // Store relative path in s3Key for consistency with database schema
    const relativePath = path.join('uploads', 'images', fileName).replace(/\\/g, '/'); // Normalize for cross-platform

    // Extract metadata
    const image = sharp(file.buffer);
    const sharpMetadata = await image.metadata();

    const width = sharpMetadata.width || 0;
    const height = sharpMetadata.height || 0;

    if (!sharpMetadata.width) console.warn('Warning: Image width is undefined');
    if (!sharpMetadata.height) console.warn('Warning: Image height is undefined');

    const metadata = await addImage({
      name: file.originalname,
      size: file.size,
      width,
      height,
      fileType: file.mimetype,
      s3Key: relativePath, // Store local path in s3Key field
      bookmarked: false,
    });

    return metadata;
  } else {
    // S3 storage (existing logic)
    const s3Key = `images/${fileName}`;

    // Upload to S3
    if (!bucketName) {
      console.error('Error: bucketName is undefined');
      throw new Error('Bucket name not configured');
    }

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(uploadCommand);

    // Extract metadata
    const image = sharp(file.buffer);
    const sharpMetadata = await image.metadata();

    const width = sharpMetadata.width || 0;
    const height = sharpMetadata.height || 0;

    if (!sharpMetadata.width) console.warn('Warning: Image width is undefined');
    if (!sharpMetadata.height) console.warn('Warning: Image height is undefined');

    const metadata = await addImage({
      name: file.originalname,
      size: file.size,
      width,
      height,
      fileType: file.mimetype,
      s3Key,
      bookmarked: false,
    });

    return metadata;
  }
};

export const uploadImageHandler = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    // Validate the image
    const validation = await validateImage(file.buffer);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Upload the image
    await uploadImage(file);

    res.status(201).json({ message: 'Image uploaded successfully.' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image.' });
  }
};
