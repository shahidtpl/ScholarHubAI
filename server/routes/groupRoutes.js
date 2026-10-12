const express = require('express');
const mongoose = require('mongoose');
const Group = require('../models/Group');
const Resource = require('../models/Resource');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const populateGroup = (query, includeMessages = false) => {
  const populatedQuery = query
    .populate('createdBy', 'name role department')
    .populate('members', 'name role department')
    .populate('resources', 'title category fileUrl author year')
    .populate('sharedResources', 'title category fileUrl author year');
  return includeMessages
    ? populatedQuery.populate('messages.user', 'name role department')
    : populatedQuery.select('-messages');
};

router.get('/', async (req, res) => {
  try {
    const query = {};
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const department = typeof req.query.department === 'string' ? req.query.department.trim() : '';
    if (search) {
      const searchPattern = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { name: searchPattern },
        { description: searchPattern },
        { department: searchPattern },
      ];
    }
    if (department && department !== 'All') {
      query.department = new RegExp(`^${escapeRegex(department)}$`, 'i');
    }

    const groups = await populateGroup(Group.find(query).sort({ createdAt: -1 }));
    res.json({ groups });
  } catch (error) {
    console.error('Error fetching academic groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid group ID' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.some((memberId) => memberId.equals(req.user._id))) {
      return res.status(403).json({ message: 'Join the group to enter its workspace' });
    }

    const populatedGroup = await populateGroup(Group.findById(group._id), true);
    res.json({ group: populatedGroup });
  } catch (error) {
    console.error('Error fetching research circle workspace:', error);
    res.status(500).json({ message: 'Failed to load the circle workspace' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, description = '', department = '' } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    if (typeof description !== 'string' || typeof department !== 'string') {
      return res.status(400).json({ message: 'Description and department must be strings' });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description.trim(),
      department: department.trim(),
      createdBy: req.user._id,
      members: [req.user._id],
    });
    res.status(201).json({ success: true, group });
  } catch (error) {
    console.error('Error creating academic group:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to create group' });
  }
});

router.post('/:id/join', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid group ID' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some((memberId) => memberId.equals(req.user._id));
    if (isMember) {
      group.members.pull(req.user._id);
    } else {
      group.members.push(req.user._id);
    }
    await group.save();

    res.json({
      success: true,
      joined: !isMember,
      group: { _id: group._id, members: group.members },
    });
  } catch (error) {
    console.error('Error toggling group membership:', error);
    res.status(500).json({ message: 'Failed to update group membership' });
  }
});

router.post('/:id/messages', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid group ID' });
    }

    const body = req.body || {};
    const text = body.text === undefined ? '' : body.text;
    const attachmentUrl = body.attachmentUrl === undefined ? '' : body.attachmentUrl;
    const attachmentType = body.attachmentType;
    if (typeof text !== 'string' || text.trim().length > 5000) {
      return res.status(400).json({ message: 'Message must be a string of at most 5000 characters' });
    }
    if (typeof attachmentUrl !== 'string' || attachmentUrl.length > 3 * 1024 * 1024) {
      return res.status(400).json({ message: 'Attachment URL must be a string of at most 3 MB' });
    }
    if (!text.trim() && !attachmentUrl) {
      return res.status(400).json({ message: 'A message or attachment is required' });
    }
    if (attachmentUrl) {
      const isAudioDataUrl = /^data:audio\/(?:webm|mp4|mpeg|ogg|wav|x-wav)(?:;[a-z0-9._=-]+)*;base64,[A-Za-z0-9+/=]+$/i.test(attachmentUrl);
      let isWebUrl = false;
      try {
        const parsedUrl = new URL(attachmentUrl);
        isWebUrl = parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
      } catch {
        isWebUrl = false;
      }
      if (!isAudioDataUrl && !isWebUrl) {
        return res.status(400).json({ message: 'Attachment must be an audio recording or an HTTP(S) URL' });
      }
    }
    if (attachmentType !== undefined && !['audio', 'file', 'link'].includes(attachmentType)) {
      return res.status(400).json({ message: 'Attachment type must be audio, file, or link' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.some((memberId) => memberId.equals(req.user._id))) {
      return res.status(403).json({ message: 'Join the group before posting a message' });
    }

    group.messages.push({
      user: req.user._id,
      text: text.trim(),
      attachmentUrl,
      attachmentType: attachmentUrl ? attachmentType || 'link' : undefined,
    });
    await group.save();
    await group.populate('messages.user', 'name role department');
    res.status(201).json({ success: true, message: group.messages[group.messages.length - 1] });
  } catch (error) {
    console.error('Error posting group discussion message:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to post discussion message' });
  }
});

router.post('/:id/share-resource', protect, async (req, res) => {
  try {
    const body = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid group ID' });
    }
    const resourceId = body.resourceId;
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ message: 'Valid resourceId is required' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.some((memberId) => memberId.equals(req.user._id))) {
      return res.status(403).json({ message: 'Join the group before sharing a resource' });
    }

    const resource = await Resource.findOne({
      _id: resourceId,
      status: 'approved',
    });
    if (!resource) return res.status(404).json({ message: 'Approved resource not found' });

    const isAlreadyShared = [...group.resources, ...group.sharedResources]
      .some((groupResourceId) => groupResourceId.equals(resource._id));
    if (!isAlreadyShared) {
      group.sharedResources.push(resource._id);
      await group.save();
    }
    const populatedGroup = await populateGroup(Group.findById(group._id));
    res.json({ success: true, group: populatedGroup });
  } catch (error) {
    console.error('Error sharing resource with group:', error);
    res.status(500).json({ message: 'Failed to share resource' });
  }
});

module.exports = router;
