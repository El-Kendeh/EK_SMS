const { Op } = require('sequelize');
const crypto = require('crypto');
const WhistleblowerCategory = require('../models/WhistleblowerCategory');
const WhistleblowerReport = require('../models/WhistleblowerReport');

const successResponse = (data = {}, message = 'Success') => ({ success: true, message, ...data });
const errorResponse = (message) => ({ success: false, message });

function generateFollowUpKey() {
  return `WB-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

async function getCategories(req, res) {
  try {
    const school = req.user?.school_id || req.query.school_id;
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const categories = await WhistleblowerCategory.findAll({
      where: { school_id: school, is_active: true },
      order: [['name', 'ASC']],
    });

    // Return school_id so an authenticated caller (e.g. the teacher) can capture it here
    // and then submit the report ANONYMOUSLY (no token) with school_id passed explicitly.
    return res.json(successResponse({ categories, school_id: school }));
  } catch (err) {
    console.error('getCategories Error:', err);
    return res.status(500).json(errorResponse(`Failed to fetch categories`));
  }
}

async function submitReport(req, res) {
  try {
    const school = req.user?.school_id || req.body.school_id;
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { category_id, title, description, severity, reporter_type } = req.body;
    if (!title || !description) return res.status(400).json(errorResponse('Title and description are required'));

    const followUpKey = generateFollowUpKey();

    const report = await WhistleblowerReport.create({
      school_id: school,
      category_id: category_id || null,
      title,
      description,
      severity: severity || 'medium',
      reporter_type: reporter_type || 'anonymous',
      follow_up_key: followUpKey,
      status: 'received',
    });

    return res.json(successResponse({
      id: report.id,
      follow_up_key: followUpKey,
    }, 'Report submitted. Save your follow-up key to check status.'));
  } catch (err) {
    console.error('submitReport Error:', err);
    return res.status(500).json(errorResponse(`Failed to submit report`));
  }
}

async function checkStatus(req, res) {
  try {
    // The route param is :key — the old code read req.params.follow_up_key (undefined)
    // and `req.params || req.query` never falls through, so it always 400'd (audit #86).
    const follow_up_key = req.params.key || req.query.follow_up_key;
    if (!follow_up_key) return res.status(400).json(errorResponse('follow_up_key is required'));

    const report = await WhistleblowerReport.findOne({ where: { follow_up_key } });
    if (!report) return res.status(404).json(errorResponse('Report not found'));

    return res.json(successResponse({
      ticketId: report.id,
      id: report.id,
      title: report.title,
      status: report.status,
      severity: report.severity,
      created_at: report.created_at,
      updates: [],
    }));
  } catch (err) {
    console.error('checkStatus Error:', err);
    return res.status(500).json(errorResponse(`Failed to check status`));
  }
}

module.exports = { getCategories, submitReport, checkStatus };
