const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const mongoose = require('mongoose');
const Resource = require('../models/Resource');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const SUMMARY_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.8-flash',
];

// 1. Multer Storage Setup for PDF uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed!'), false);
    }
  }
});

// 2. GET all resources (with search, category filter, and role visibility)
router.get('/', async (req, res) => {
  try {
    const { category, search, department } = req.query;
    const query = { status: 'approved' };

    if (category && category !== 'All') {
      query.category = category;
    }
    if (department && department !== 'All') {
      query.department = new RegExp(department, 'i');
    }
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { author: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { department: new RegExp(search, 'i') }
      ];
    }
    const resources = await Resource.find(query).sort({ createdAt: -1 });
    res.json({ resources });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ message: 'Failed to fetch resources' });
  }
});

// Resources submitted by the authenticated user, regardless of review status.
router.get('/my', protect, async (req, res) => {
  try {
    const myResources = await Resource.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(myResources);
  } catch (error) {
    console.error('Error fetching user submissions:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/mine', protect, async (req, res) => {
  try {
    const resources = await Resource.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ resources });
  } catch (error) {
    console.error('Error fetching user submissions:', error);
    res.status(500).json({ message: 'Failed to fetch your submissions' });
  }
});

router.get('/manage', protect, authorize('teacher', 'admin'), async (_req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    res.json({ resources });
  } catch (error) {
    console.error('Error fetching resources for management:', error);
    res.status(500).json({ message: 'Failed to fetch resources' });
  }
});

router.get('/user/saved', protect, async (req, res) => {
  try {
    await req.user.populate('savedResources');
    res.json({ resources: req.user.savedResources });
  } catch (error) {
    console.error('Error fetching saved resources:', error);
    res.status(500).json({ message: 'Failed to fetch your saved resources' });
  }
});

router.get('/pending', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const query = { status: 'pending' };
    if (req.user.role?.toLowerCase()?.trim() === 'teacher') {
      query.$or = [
        { assignedReviewerEmail: req.user.email },
        { assignedReviewer: req.user._id },
      ];
    }
    const resources = await Resource.find(query)
      .populate('uploadedBy', 'name role department')
      .sort({ createdAt: 1 });
    res.json({ resources });
  } catch (error) {
    console.error('Error fetching pending resources:', error);
    res.status(500).json({ message: 'Failed to fetch pending approvals' });
  }
});

router.get('/stats', protect, authorize('teacher', 'admin'), async (_req, res) => {
  try {
    const [totalResources, pendingApprovals, totalUsers] = await Promise.all([
      Resource.countDocuments(),
      Resource.countDocuments({ status: 'pending' }),
      User.countDocuments(),
    ]);
    res.json({ stats: { totalResources, pendingApprovals, totalUsers } });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

// 3. GET single resource by ID
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('uploadedBy', 'name role department')
      .populate('comments.user', 'name');
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    res.json({ resource });
  } catch (error) {
    console.error('Error retrieving resource details:', error);
    res.status(500).json({ message: 'Error retrieving resource details' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    const isOwner = Boolean(
      resource.uploadedBy &&
      resource.uploadedBy.toString() === req.user._id.toString()
    );
    const isPrivileged = ['teacher', 'admin'].includes(req.user.role?.toLowerCase()?.trim());
    if (isOwner !== true && !isPrivileged) {
      return res.status(403).json({ message: 'Not authorized to delete this resource' });
    }

    const filename = resource.fileName || resource.fileUrl;
    const filePath = filename ? path.join(uploadsDir, path.basename(filename)) : null;
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Resource.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ message: 'Failed to delete resource' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    const isOwner = Boolean(
      resource.uploadedBy &&
      resource.uploadedBy.toString() === req.user._id.toString()
    );
    const isPrivileged = ['teacher', 'admin'].includes(req.user.role?.toLowerCase()?.trim());
    if (isOwner !== true && !isPrivileged) {
      return res.status(403).json({ message: 'Not authorized to edit this resource' });
    }

    const body = req.body || {};
    for (const field of ['title', 'author', 'department', 'category', 'description']) {
      if (body[field] !== undefined) resource[field] = body[field];
    }
    if (body.publicationYear !== undefined || body.year !== undefined) {
      const publicationYear = body.publicationYear ?? body.year;
      resource.year = publicationYear === '' || publicationYear === null
        ? undefined
        : Number(publicationYear);
    }

    await resource.save();
    res.json({ success: true, resource });
  } catch (error) {
    console.error('Error updating resource:', error);
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to update resource' });
  }
});

router.post('/:id/rating', protect, async (req, res) => {
  try {
    const body = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const score = Number(body.score);
    const review = body.review === undefined ? '' : body.review;
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ message: 'Score must be an integer from 1 to 5' });
    }
    if (typeof review !== 'string') {
      return res.status(400).json({ message: 'Review must be a string' });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource || resource.status !== 'approved') {
      return res.status(404).json({ message: 'Approved resource not found' });
    }

    const existingRating = resource.ratings.find(
      (rating) => rating.user.equals(req.user._id)
    );
    if (existingRating) {
      existingRating.score = score;
      existingRating.review = review.trim();
      existingRating.createdAt = new Date();
    } else {
      resource.ratings.push({
        user: req.user._id,
        score,
        review: review.trim(),
      });
    }
    resource.averageRating = resource.ratings.reduce(
      (total, rating) => total + rating.score,
      0
    ) / resource.ratings.length;
    await resource.save();

    res.json({
      success: true,
      averageRating: resource.averageRating,
      ratings: resource.ratings,
    });
  } catch (error) {
    console.error('Error adding resource rating:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to add resource rating' });
  }
});

const postResourceComment = async (req, res, returnComments) => {
  try {
    const body = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }
    if (typeof body.text !== 'string' || !body.text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const resource = await Resource.findOne({
      _id: req.params.id,
      status: 'approved',
    });
    if (!resource) return res.status(404).json({ message: 'Approved resource not found' });

    const comment = {
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      name: req.user.name,
      text: body.text.trim(),
    };
    resource.comments.push(comment);
    await resource.save();

    if (returnComments) {
      return res.status(201).json({ comments: resource.comments });
    }
    return res.status(201).json({
      success: true,
      comment: resource.comments[resource.comments.length - 1],
    });
  } catch (error) {
    console.error('Error posting resource comment:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to post comment' });
  }
};

router.post('/:id/comment', protect, (req, res) => postResourceComment(req, res, false));
router.post('/:id/comments', protect, (req, res) => postResourceComment(req, res, true));

router.post('/:id/bookmark', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findOne({
      _id: req.params.id,
      status: 'approved',
    });
    if (!resource) return res.status(404).json({ message: 'Approved resource not found' });

    req.user.savedResources = req.user.savedResources || [];
    const isSaved = req.user.savedResources.some(
      (savedResourceId) => savedResourceId.equals(resource._id)
    );
    if (isSaved) {
      req.user.savedResources.pull(resource._id);
    } else {
      req.user.savedResources.push(resource._id);
    }
    await req.user.save();

    res.json({ isBookmarked: !isSaved });
  } catch (error) {
    console.error('Error toggling resource bookmark:', error);
    res.status(500).json({ message: 'Failed to update bookmark' });
  }
});

router.get('/:id/recommendations', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findById(req.params.id).select('category department');
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    const matchingFields = [{ category: resource.category }];
    if (resource.department) matchingFields.push({ department: resource.department });
    const recommendations = await Resource.find({
      _id: { $ne: resource._id },
      status: 'approved',
      $or: matchingFields,
    })
      .sort({ averageRating: -1, views: -1, createdAt: -1 })
    .limit(3);

    res.json({ recommendations });
  } catch (error) {
    console.error('Error fetching resource recommendations:', error);
    res.status(500).json({ message: 'Failed to fetch recommendations' });
  }
});

router.post('/:id/download-increment', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, status: 'approved' },
      { $inc: { downloadsCount: 1 } },
      { new: true }
    ).select('downloadsCount');
    if (!resource) return res.status(404).json({ message: 'Approved resource not found' });

    console.log(`Resource ${req.params.id} download count incremented to ${resource.downloadsCount}`);
    res.json({ success: true, downloadsCount: resource.downloadsCount });
  } catch (error) {
    console.error('Error incrementing resource downloads:', error);
    res.status(500).json({ message: 'Failed to increment download count' });
  }
});

// 4. POST Upload new resource
const resolveAssignedReviewer = async (req, res, next) => {
  const email = typeof req.body?.assignedReviewerEmail === 'string'
    ? req.body.assignedReviewerEmail.trim().toLowerCase()
    : '';
  const removeUploadedFile = async () => {
    if (!req.file?.path) return;
    try {
      await fs.promises.unlink(req.file.path);
    } catch (error) {
      console.error('Failed to remove rejected resource upload:', error);
    }
  };
  if (!email) {
    await removeUploadedFile();
    return res.status(400).json({
      message: 'Assigned Teacher email is required for peer verification',
    });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    await removeUploadedFile();
    return res.status(400).json({ message: 'Please provide a valid Teacher email address' });
  }

  try {
    req.body.assignedReviewerEmail = email;
    const teacherUser = await User.findOne({ email, role: 'teacher' }).select('_id');
    req.assignedReviewerId = teacherUser?._id || null;
    next();
  } catch (error) {
    await removeUploadedFile();
    console.error('Error resolving assigned Teacher:', error);
    res.status(500).json({ message: 'Failed to verify assigned Teacher' });
  }
};

router.post('/', protect, upload.single('file'), resolveAssignedReviewer, async (req, res) => {
  try {
    const {
      title,
      author,
      category,
      department,
      year,
      description,
      tags,
      assignedReviewerEmail,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    const uploaderName = req.user.name || 'Academic Contributor';
    const status = ['teacher', 'admin'].includes(req.user.role?.toLowerCase()?.trim()) ? 'approved' : 'pending';

    // Relative URL for serving static file
    const fileUrl = `/uploads/${req.file.filename}`;

    const newResource = new Resource({
      title: title || req.file.originalname,
      author: author || 'Academic Contributor',
      category: category || 'Research Papers',
      department: department || 'General Studies',
      year: year || new Date().getFullYear(),
      description: description || '',
      fileUrl,
      fileName: req.file.filename,
      tags: typeof tags === 'string'
        ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [],
      uploadedBy: req.user._id,
      assignedReviewerEmail,
      assignedReviewer: req.assignedReviewerId,
      uploaderName,
      status
    });

    const saved = await newResource.save();
    res.status(201).json({ success: true, resource: saved });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Failed to upload resource: ' + error.message });
  }
});

// 5. POST /:id/summarize (Gemini AI Summary integration)
router.post('/:id/summarize', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    let extractedText = '';
    const filename = resource.fileUrl || resource.filename || resource.fileName;
    const filePath = filename
      ? path.join(uploadsDir, path.basename(filename))
      : null;

    if (filePath && fs.existsSync(filePath)) {
      let parser;
      try {
        parser = new PDFParse({ data: fs.readFileSync(filePath) });
        const pdfData = await parser.getText();
        extractedText = pdfData.text
          ? pdfData.text.replace(/\s+/g, ' ').trim().slice(0, 15000)
          : '';
      } catch (error) {
        console.error('PDF parsing error:', error);
      } finally {
        if (parser) {
          try {
            await parser.destroy();
          } catch (error) {
            console.error('PDF parser cleanup error:', error);
          }
        }
      }
    }

    if (!extractedText) {
      extractedText = [
        `Title: ${resource.title || 'Not provided'}.`,
        `Category: ${resource.category || 'Not provided'}.`,
        `Description: ${resource.description || 'Not provided'}.`,
      ].join(' ');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const fallbackSummary = {
      executiveSummary: `Academic study examining ${resource.title} within the scope of ${resource.department || 'academic research'}.`,
      keyObjectives: `• Analyze primary principles and objectives related to ${resource.title}.\n• Evaluate core literature and institutional relevance.`,
      methodology: '• Qualitative document assessment and academic synthesis.',
      practicalFindings: `• Structured insights on ${resource.title}.\n• Baseline data points for academic and student reference.`,
      academicImpact: '• Contributes foundational knowledge to campus digital archives.',
    };
    const prompt = `Analyze this academic document and return ONLY a valid JSON object without markdown formatting or code blocks. The JSON must have these exact keys:
{
  "executiveSummary": "Detailed 3-4 sentence academic overview of the study",
  "keyObjectives": "2-3 clear bullet points on research questions or goals",
  "methodology": "2-3 clear bullet points detailing methodology or theoretical framework",
  "practicalFindings": "3-4 clear bullet points summarizing key findings and empirical takeaways",
  "academicImpact": "1-2 bullet points on institutional and research contributions"
}
 
Document text:
${extractedText}`;

    let summaryData = null;
    if (!apiKey) {
      console.error('Gemini summary unavailable: GEMINI_API_KEY is not defined');
    } else {
      for (const modelName of SUMMARY_MODELS) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [{ text: prompt }],
                  },
                ],
              }),
            }
          );

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gemini API returned ${response.status}: ${errorBody}`);
          }

          const responseData = await response.json();
          const generatedText = responseData
            && responseData.candidates
            && responseData.candidates[0]
            && responseData.candidates[0].content
            && responseData.candidates[0].content.parts
            && responseData.candidates[0].content.parts[0]
            && responseData.candidates[0].content.parts[0].text;
          if (typeof generatedText !== 'string' || !generatedText.trim()) {
            throw new Error('Gemini returned an empty summary');
          }

          const cleaned = generatedText
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          const parsedSummary = JSON.parse(cleaned);
          const candidateSummary = {
            executiveSummary: parsedSummary.executiveSummary,
            keyObjectives: parsedSummary.keyObjectives,
            methodology: parsedSummary.methodology,
            practicalFindings: parsedSummary.practicalFindings,
            academicImpact: parsedSummary.academicImpact,
          };
          if (Object.values(candidateSummary).some(
            (value) => typeof value !== 'string' || !value.trim()
          )) {
            throw new Error('Gemini returned an incomplete summary');
          }

          summaryData = candidateSummary;
          break;
        } catch (error) {
          console.error(`Gemini summary attempt failed for ${modelName}:`, error);
        }
      }
    }

    if (!summaryData) summaryData = fallbackSummary;

    resource.aiSummary = summaryData;
    await resource.save();

    res.json({ success: true, summary: resource.aiSummary });
  } catch (error) {
    console.error('Gemini Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate summary: ' + error.message,
    });
  }
});

const reviewResource = async (req, res) => {
  try {
    const { status, feedback = '' } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }
    if (typeof feedback !== 'string') {
      return res.status(400).json({ message: 'Feedback must be a string' });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    if (
      req.user.role?.toLowerCase()?.trim() === 'teacher' &&
      resource.assignedReviewerEmail !== req.user.email &&
      !resource.assignedReviewer?.equals(req.user._id)
    ) {
      return res.status(403).json({ message: 'Not assigned to review this resource' });
    }
    resource.status = status;
    resource.feedback = feedback.trim();
    await resource.save();

    if (resource.uploadedBy) {
      await User.findByIdAndUpdate(resource.uploadedBy, {
        $push: {
          notifications: {
            title: `Resource ${status}`,
            message: feedback.trim() || `Your resource "${resource.title}" was ${status}.`,
            link: `/resources/${resource._id}`,
          },
        },
      });
    }

    await resource.populate('uploadedBy', 'name role department');
    res.json({ success: true, resource });
  } catch (error) {
    console.error('Error reviewing resource:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to review resource' });
  }
};

router.patch('/:id/review', protect, authorize('teacher', 'admin'), reviewResource);
router.patch('/:id/status', protect, authorize('teacher', 'admin'), reviewResource);

module.exports = router;