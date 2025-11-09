import ImageModel from '../models/Image';

export const bookmarkImageResolver = async (_: any, { id, bookmarked }: { id: string, bookmarked: boolean }) => {
  const updatedImage = await ImageModel.findOneAndUpdate(
    { _id: id, deletedAt: { $exists: false } },
    { bookmarked },
    { new: true } // Return the updated document
  );

  if (!updatedImage) {
    throw new Error('Image not found');
  }

  return {
    id: updatedImage._id.toString(),
    name: updatedImage.name,
    size: updatedImage.size,
    width: updatedImage.width,
    height: updatedImage.height,
    fileType: updatedImage.fileType,
    s3Key: updatedImage.s3Key,
    createdAt: updatedImage.createdAt,
    bookmarked: updatedImage.bookmarked,
  };
};
