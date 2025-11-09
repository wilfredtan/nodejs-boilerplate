import ImageModel from './models/Image';

export interface ImageMetadata {
  id: string;
  name: string;
  size: number;
  width: number;
  height: number;
  fileType: string;
  s3Key: string;
  createdAt: Date;
  bookmarked?: boolean;
}

export const addImage = async (image: Omit<ImageMetadata, 'id' | 'createdAt'>): Promise<ImageMetadata> => {
  const savedImage = await ImageModel.create({
    name: image.name,
    size: image.size,
    width: image.width,
    height: image.height,
    fileType: image.fileType,
    s3Key: image.s3Key,
    bookmarked: image.bookmarked || false,
  });
  return {
    id: savedImage._id.toString(),
    name: savedImage.name,
    size: savedImage.size,
    width: savedImage.width,
    height: savedImage.height,
    fileType: savedImage.fileType,
    s3Key: savedImage.s3Key,
    createdAt: savedImage.createdAt,
    bookmarked: savedImage.bookmarked,
  };
};
