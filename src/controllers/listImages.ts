import ImageModel from '../models/Image';
import { isLocal } from '../utils/storage';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });

export const listImagesResolver = async (_: any, { search, bookmarkFilter, page, limit }: {
  search?: string,
  bookmarkFilter?: string,
  page?: number,
  limit?: number
}) => {
  const query: any = { deletedAt: { $exists: false } };

  // Search filter
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  // Bookmark filter
  if (bookmarkFilter === 'bookmarked') {
    query.bookmarked = true;
  } else if (bookmarkFilter === 'unbookmarked') {
    query.bookmarked = false;
  }
  // 'all' or undefined means no bookmark filter

  // Pagination
  const currentPage = Math.max(1, page || 1);
  const itemsPerPage = Math.min(10, Math.max(1, limit || 20)); // Max 10 items per page, default 20
  const skip = (currentPage - 1) * itemsPerPage;

  // Get total count
  const total = await ImageModel.countDocuments(query);

  // Get paginated results
  const images = await ImageModel
    .find(query)
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(itemsPerPage)
    .lean();

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  // Transform images to include id, thumbnailUrl, and previewUrl
  const transformedImages = await Promise.all(images.map(async (img) => {
    const imgId = img._id.toHexString();

    // Generate thumbnail URL (for table previews)
    let thumbnailUrl = '';
    const thumbnailKey = img.thumbnailS3Key;
    if (thumbnailKey) {
      if (isLocal()) {
        thumbnailUrl = `http://localhost:3001/api/images/local-thumbnail/${imgId}`;
      } else {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: thumbnailKey
          });
          thumbnailUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        } catch (error) {
          console.error('Error generating S3 presigned URL for thumbnail:', error);
        }
      }
    }

    // Generate preview URL (for panorama viewer - full image)
    let previewUrl = '';
    if (isLocal()) {
      previewUrl = `http://localhost:3001/api/images/local-download/${imgId}`;
    } else {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: img.s3Key
        });
        previewUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      } catch (error) {
        console.error('Error generating S3 presigned URL for full image:', error);
      }
    }

    return {
      id: imgId,
      name: img.name,
      size: img.size,
      width: img.width,
      height: img.height,
      fileType: img.fileType,
      createdAt: img.createdAt,
      bookmarked: img.bookmarked,
      thumbnailUrl,
      previewUrl
    };
  }));

  return {
    images: transformedImages,
    total,
    page: currentPage,
    limit: itemsPerPage,
    totalPages,
  };
};
