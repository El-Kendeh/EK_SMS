const path = require('path');
const fs = require('fs');
let pdfParse = null;
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Key comes ONLY from the environment. The previous hardcoded fallback key was a
// committed secret (removed 2026-06-23) — rotate it in the Google console.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

async function extractText(filePath, mimetype) {
  const buffer = fs.readFileSync(filePath);

  if (mimetype === 'application/pdf') {
    if (!pdfParse) {
      pdfParse = require('pdf-parse');
    }
    const data = await pdfParse(buffer);
    return data.text;
  } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (mimetype === 'text/plain') {
    return buffer.toString('utf-8');
  } else {
    throw new Error('Unsupported file type. Upload PDF, DOCX, or TXT files.');
  }
}

function buildPrompt(subjectName, className, documentText) {
  return `
You are an expert curriculum designer. Generate a detailed weekly lesson plan based on the uploaded syllabus document for the subject "${subjectName}" and class "${className}".

The document content is:
---
${documentText}
---

Instructions:
1. Extract all topics/units from the document in the exact order they appear.
2. Distribute them across weeks logically (1-3 topics per week depending on complexity).
3. Continue generating weeks until ALL content from the document is covered, even if it takes many weeks.
4. For each week, provide:
   - week_number (integer, starting from 1)
   - title (the main topic for the week)
   - description (a brief description of what will be covered)
   - objectives (array of 2-4 learning objectives)
   - activities (array of 2-3 suggested activities)
   - assessment (suggested assessment method)
   - duration_weeks (integer, usually 1 or 2)

Return ONLY a valid JSON array of week objects. Do NOT include any markdown or text outside the JSON.
Example format:
[
  {
    "week_number": 1,
    "title": "Introduction to ...",
    "description": "...",
    "objectives": ["Objective 1", "Objective 2"],
    "activities": ["Activity 1", "Activity 2"],
    "assessment": "Quiz",
    "duration_weeks": 1
  }
]
`;
}

async function generateSyllabusWithGemini(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text().trim();

  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  }

  return JSON.parse(text);
}

async function generateSyllabusFromDocument(req, res) {
  try {
    if (!genAI) {
      return res.status(503).json({ success: false, message: 'AI syllabus generation is not configured (GEMINI_API_KEY is not set).' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { subject_id, class_id, subject_name, class_name } = req.body;

    if (!subject_id || !class_id) {
      return res.status(400).json({ success: false, message: 'subject_id and class_id are required.' });
    }

    const filePath = req.file.path;
    const mimetype = req.file.mimetype;

    // Extract text from document
    const documentText = await extractText(filePath, mimetype);

    if (!documentText || documentText.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Could not extract meaningful text from the document.' });
    }

    // Build prompt and call Gemini
    const prompt = buildPrompt(subject_name || 'Unknown Subject', class_name || 'Unknown Class', documentText);
    const weeks = await generateSyllabusWithGemini(prompt);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    return res.json({
      success: true,
      message: `Generated ${weeks.length} weeks of lesson plans.`,
      weeks,
      document_summary: documentText.slice(0, 500) + (documentText.length > 500 ? '...' : ''),
    });
  } catch (err) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('generateSyllabusFromDocument Error:', err);
    return res.status(500).json({
      success: false,
      message: `Failed to generate syllabus`,
    });
  }
}

module.exports = {
  generateSyllabusFromDocument,
};
