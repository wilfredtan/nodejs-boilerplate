import ImageModel from '../models/Image';

export const analyticsResolver = async () => {
  const matchCondition = { deletedAt: { $exists: false } };

  // Get total counts and sizes using aggregation
  const stats = await ImageModel.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalImages: { $sum: 1 },
        bookmarkedCount: { $sum: { $cond: ['$bookmarked', 1, 0] } },
        unbookmarkedCount: { $sum: { $cond: ['$bookmarked', 0, 1] } },
        totalSizeBookmarked: { $sum: { $cond: ['$bookmarked', '$size', 0] } },
        totalSizeUnbookmarked: { $sum: { $cond: ['$bookmarked', 0, '$size'] } },
      },
    },
  ]);

  const result = stats[0] || {
    totalImages: 0,
    bookmarkedCount: 0,
    unbookmarkedCount: 0,
    totalSizeBookmarked: 0,
    totalSizeUnbookmarked: 0,
  };

  return {
    totalImages: result.totalImages,
    bookmarkedCount: result.bookmarkedCount,
    unbookmarkedCount: result.unbookmarkedCount,
    totalSizeBookmarked: result.totalSizeBookmarked,
    totalSizeUnbookmarked: result.totalSizeUnbookmarked,
  };
};
