const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const AIDocumentCapture = require('../models/AIDocumentCapture');

// Key comes ONLY from the environment (same convention as syllabusGenerator.js).
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

let pdfParse = null;
const mammoth = require('mammoth');

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

// Per-document-type extraction contracts. The keys define the columns Gemini must
// return so the rows drop cleanly into the Students/Teachers bulk-import wizards.
const TYPE_SCHEMAS = {
  student_roster: {
    label: 'student roster',
    columns: ['first_name', 'last_name', 'admission_number', 'date_of_birth', 'gender', 'class', 'guardian_name', 'guardian_phone'],
  },
  teacher_roster: {
    label: 'teacher roster',
    columns: ['first_name', 'last_name', 'employee_id', 'subject', 'qualification', 'phone', 'email'],
  },
  grade_sheet: {
    label: 'grade sheet',
    columns: ['student_name', 'admission_number', 'subject', 'term', 'ca', 'exam', 'total', 'grade', 'remarks'],
  },
  attendance_sheet: {
    label: 'attendance sheet',
    columns: ['student_name', 'admission_number', 'date', 'status', 'remarks'],
  },
  other: { label: 'document', columns: null },
};

function buildPrompt(documentType) {
  const schema = TYPE_SCHEMAS[documentType] || TYPE_SCHEMAS.other;
  const columnInstruction = schema.columns
    ? `Each object MUST use exactly these keys: ${schema.columns.map((c) => `"${c}"`).join(', ')}. Use null for any value the document does not contain — never invent data.`
    : `Infer a sensible, consistent set of column keys from the document's own headers, and use the same keys for every row.`;

  return `You are a precise data-extraction engine. Extract every data row from the uploaded ${schema.label}.
${columnInstruction}

Rules:
- Preserve the exact values shown in the document; do not summarize, translate, or reformat.
- Return ONE object per record/row in the document, in the order they appear.
- Output ONLY a valid JSON array of flat objects. No markdown, no code fences, no commentary.
- If the document contains no extractable rows, return an empty array [].`;
}

async function extractDocText(filePath, mimetype, originalname) {
  const ext = path.extname(originalname || '').toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (mimetype === 'application/pdf' || ext === '.pdf') {
    if (!pdfParse) pdfParse = require('pdf-parse');
    return (await pdfParse(buffer)).text;
  }
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
    return (await mammoth.extractRawText({ buffer })).value;
  }
  if (mimetype === 'text/plain' || ext === '.txt') {
    return buffer.toString('utf-8');
  }
  if (mimetype === 'text/csv' || mimetype === 'application/vnd.ms-excel' || mimetype === 'application/csv' || ext === '.csv') {
    return buffer.toString('utf-8');
  }
  throw new Error('Unsupported file type. Upload a PDF, DOCX, TXT, CSV, or image (PNG/JPG/WEBP).');
}

function parseRows(rawText) {
  let text = (rawText || '').trim();
  // Strip ```json fences Gemini sometimes wraps the array in.
  if (text.startsWith('```')) {
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    throw new Error('The AI response could not be parsed into rows. Try a clearer document.');
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.rows)) return parsed.rows;
  return [];
}

async function runExtraction(file, documentType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = buildPrompt(documentType);

  let result;
  if (IMAGE_MIMES.includes(file.mimetype)) {
    // Multimodal: hand Gemini the raw image bytes alongside the prompt.
    const data = fs.readFileSync(file.path).toString('base64');
    result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: file.mimetype, data } },
    ]);
  } else {
    const documentText = await extractDocText(file.path, file.mimetype, file.originalname);
    if (!documentText || documentText.trim().length < 5) {
      throw new Error('Could not read any text from the document.');
    }
    result = await model.generateContent(
      `${prompt}\n\nDOCUMENT CONTENT:\n---\n${documentText}\n---`,
    );
  }

  const response = await result.response;
  return parseRows(response.text());
}

// POST /api/school/ai-capture/  (multipart: file, document_type)
async function aiCaptureUpload(req, res) {
  let capture = null;
  const cleanup = () => {
    try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
  };

  try {
    if (!genAI) {
      return res.status(503).json({ success: false, message: 'AI document capture is not configured (GEMINI_API_KEY is not set).' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const schoolId = req.schoolId || req.user?.school_id;
    if (!schoolId) {
      cleanup();
      return res.status(401).json({ success: false, message: 'No school is linked to your account.' });
    }

    const documentType = TYPE_SCHEMAS[req.body.document_type] ? req.body.document_type : 'other';

    capture = await AIDocumentCapture.create({
      school_id: schoolId,
      document_type: documentType,
      status: 'processing',
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_mimetype: req.file.mimetype,
      uploaded_by: req.user?.id || null,
    });

    const rows = await runExtraction(req.file, documentType);
    const columns = rows[0] ? Object.keys(rows[0]) : [];

    await capture.update({
      status: 'done',
      rows_count: rows.length,
      extracted_rows: JSON.stringify(rows),
    });
    cleanup();

    return res.json({
      success: true,
      message: `Extracted ${rows.length} row${rows.length === 1 ? '' : 's'}.`,
      capture_id: capture.id,
      structured: { rows, columns },
    });
  } catch (err) {
    cleanup();
    console.error('aiCaptureUpload Error:', err);
    if (capture) {
      try { await capture.update({ status: 'failed', error: String(err.message || err).slice(0, 1000) }); } catch (_) { /* ignore */ }
    }
    return res.status(500).json({ success: false, message: err.message || 'AI extraction failed.' });
  }
}

// GET /api/school/ai-capture/list/
async function aiCaptureList(req, res) {
  try {
    const schoolId = req.schoolId || req.user?.school_id;
    if (!schoolId) return res.status(401).json({ success: false, message: 'No school is linked to your account.' });

    const captures = await AIDocumentCapture.findAll({
      where: { school_id: schoolId },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    return res.json({
      success: true,
      captures: captures.map((c) => ({
        id: c.id,
        created_at: c.created_at,
        document_type: c.document_type,
        status: c.status,
        rows: c.rows_count,
        error: c.error || null,
      })),
    });
  } catch (err) {
    console.error('aiCaptureList Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load capture history.' });
  }
}

module.exports = { aiCaptureUpload, aiCaptureList };
