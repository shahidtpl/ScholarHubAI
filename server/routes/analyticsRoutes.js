const express = require('express');
const Resource = require('../models/Resource');
const Group = require('../models/Group');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/real-stats', protect, async (_req, res) => {
  try {
    const [
      totalManuscripts,
      totalUploaded,
      totalPending,
      totalCircles,
      departments,
      departmentCounts,
      departmentUploadCounts,
      topViewedPapers,
      latestResources,
      featuredPaper,
    ] = await Promise.all([
      Resource.countDocuments({ status: 'approved' }),
      Resource.countDocuments(),
      Resource.countDocuments({ status: 'pending' }),
      Group.countDocuments(),
      Resource.distinct('department', { status: 'approved' }),
      Resource.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
      Resource.aggregate([
        {
          $group: {
            _id: { $ifNull: [{ $cond: [{ $eq: ['$department', ''] }, null, '$department'] }, 'Unspecified'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
        { $project: { _id: 0, department: '$_id', count: 1 } },
      ]),
      Resource.find({ status: 'approved', category: 'Research Papers' })
        .sort({ views: -1, createdAt: -1 })
        .limit(3)
        .select('title author department views')
        .lean(),
      Resource.find({ status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(4)
        .select('title author department createdAt')
        .lean(),
      Resource.findOne({ status: 'approved' }).sort({ views: -1 }),
    ]);

    res.json({
      totalManuscripts,
      totalCircles,
      peerVerifiedPct: `${Math.round((totalManuscripts / (totalUploaded || 1)) * 100)}%`,
      totalDepartments: departments.length,
      departmentCounts,
      totalApprovedSubmissions: totalManuscripts,
      totalPendingSubmissions: totalPending,
      topViewedPapers,
      departmentUploadCounts,
      latestActivity: latestResources.map(({ title, author, department, createdAt }) => ({
        title,
        author,
        department,
        date: createdAt,
      })),
      featuredPaper,
    });
  } catch (error) {
    console.error('Error fetching real analytics stats:', error);
    res.status(500).json({ message: 'Failed to fetch real analytics stats' });
  }
});

router.get('/summary', protect, authorize('admin', 'teacher'), async (_req, res) => {
  try {
    const [
      totalResources,
      pendingApprovals,
      downloadTotals,
      categoryDistribution,
      topViewedPapers,
    ] = await Promise.all([
      Resource.countDocuments(),
      Resource.countDocuments({ status: 'pending' }),
      Resource.aggregate([
        { $group: { _id: null, total: { $sum: '$downloadsCount' } } },
      ]),
      Resource.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $project: { _id: 0, category: '$_id', count: 1 } },
      ]),
      Resource.find({ category: 'Research Papers' })
        .sort({ views: -1, createdAt: -1 })
        .limit(5)
        .select('title author category department views averageRating'),
    ]);

    res.json({
      summary: {
        totalResources,
        totalDownloads: downloadTotals[0] ? downloadTotals[0].total : 0,
        categoryDistribution,
        pendingApprovals,
        topViewedPapers,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ message: 'Failed to fetch analytics summary' });
  }
});

module.exports = router;
