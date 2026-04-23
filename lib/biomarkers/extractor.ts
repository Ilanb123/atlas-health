import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '../anthropic';

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_FILE_PAGES_NOTE = 10;

export interface ExtractedBiomarker {
  name: string;
  standardized_name: string;
  value: number;
  unit: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  reference_range_label: 'normal' | 'high' | 'low' | 'borderline' | 'unknown';
  test_date: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
}

interface RawExtraction {
  biomarkers: ExtractedBiomarker[];
  lab_source: string;
  test_date_primary: string;
  notes: string;
}

export interface ExtractionResult {
  extracted: ExtractedBiomarker[];
  lab_source: string;
  test_date: string;
  errors: string[];
}

const SUBMIT_EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'submit_extraction',
  description: 'Submit all biomarkers extracted from the lab report. Call this once you have identified every biomarker on the report.',
  input_schema: {
    type: 'object' as const,
    properties: {
      biomarkers: {
        type: 'array',
        description: 'Every biomarker found in the report.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name exactly as it appears in the report' },
            standardized_name: { type: 'string', description: 'Canonical name, e.g. "TSH", "LDL Cholesterol", "HbA1c", "hsCRP"' },
            value: { type: 'number', description: 'Numeric result value' },
            unit: { type: 'string', description: 'Unit of measurement, e.g. "mg/dL", "mIU/L", "%"' },
            reference_range_low: { type: 'number', description: 'Lower bound of the reference range, or null if not provided' },
            reference_range_high: { type: 'number', description: 'Upper bound of the reference range, or null if not provided' },
            reference_range_label: {
              type: 'string',
              enum: ['normal', 'high', 'low', 'borderline', 'unknown'],
              description: 'Status of this result relative to the reference range',
            },
            test_date: { type: 'string', description: 'Date of this test in ISO format YYYY-MM-DD' },
            category: {
              type: 'string',
              enum: ['lipids', 'thyroid', 'hormones', 'metabolic', 'inflammation', 'nutrients', 'cbc', 'other'],
            },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'high = clearly legible value and unit; medium = minor ambiguity; low = unclear or inferred',
            },
          },
          required: ['name', 'standardized_name', 'value', 'unit', 'reference_range_label', 'test_date', 'category', 'confidence'],
        },
      },
      lab_source: { type: 'string', description: 'Lab name, e.g. "Quest Diagnostics", "LabCorp", "Function Health", "Cleveland HeartLab"' },
      test_date_primary: { type: 'string', description: 'Primary collection or report date in YYYY-MM-DD format' },
      notes: { type: 'string', description: 'Extraction notes: any ambiguities, multi-page findings, or warnings' },
    },
    required: ['biomarkers', 'lab_source', 'test_date_primary', 'notes'],
  },
};

const SYSTEM_PROMPT = `You are a medical lab report extractor for Atlas Health. Your job is to extract every biomarker from a lab report document with high accuracy.

For each biomarker:
- Extract the exact name as printed, plus standardize it to a canonical form
- Extract the numeric result value and unit
- Extract the reference range bounds (low and high) if shown
- Determine whether the result is normal, high, low, borderline, or unknown
- Record the collection/test date in ISO format YYYY-MM-DD
- Assign the most appropriate category
- Rate your confidence: high (clearly legible), medium (minor ambiguity), low (unclear or inferred)

Standardization examples:
  "Thyroid Stimulating Hormone" / "Thyrotropin" → "TSH"
  "LDL-C" / "Low-Density Lipoprotein Cholesterol" → "LDL Cholesterol"
  "HDL-C" → "HDL Cholesterol"
  "Hemoglobin A1c" / "HbA1c" / "A1C" → "HbA1c"
  "hs-CRP" / "High-Sensitivity C-Reactive Protein" → "hsCRP"
  "25-Hydroxyvitamin D" / "Vitamin D, 25-OH" → "Vitamin D (25-OH)"
  "eGFR" / "Estimated GFR" → "eGFR"
  "ALT" / "Alanine Aminotransferase" → "ALT"
  "AST" / "Aspartate Aminotransferase" → "AST"
  "Free T4" / "Thyroxine, Free" → "Free T4"
  "Free T3" / "Triiodothyronine, Free" → "Free T3"
  "DHEA-S" / "Dehydroepiandrosterone Sulfate" → "DHEA-S"

Do not skip any biomarker. Process up to ${MAX_FILE_PAGES_NOTE} pages. When finished, call submit_extraction with all findings.`;

async function extractViaPdf(pdfBuffer: Buffer, filename: string): Promise<RawExtraction> {
  const base64Pdf = pdfBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [SUBMIT_EXTRACTION_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Pdf,
            },
          } as Anthropic.DocumentBlockParam,
          {
            type: 'text',
            text: `Extract all biomarkers from this lab report. Filename: ${filename}`,
          },
        ],
      },
    ],
  });

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'submit_extraction') {
      return block.input as RawExtraction;
    }
  }

  throw new Error('Claude did not call submit_extraction');
}

async function extractViaText(pdfBuffer: Buffer, filename: string): Promise<RawExtraction> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
  const parsed = await pdfParse(pdfBuffer);
  const text = parsed.text.slice(0, 40_000); // cap to avoid token overflow

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [SUBMIT_EXTRACTION_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: `Extract all biomarkers from this lab report text.\n\nFilename: ${filename}\n\n${text}`,
      },
    ],
  });

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'submit_extraction') {
      return block.input as RawExtraction;
    }
  }

  throw new Error('Claude did not call submit_extraction (text fallback)');
}

export async function extractBiomarkersFromPDF(
  pdfBuffer: Buffer,
  _userId: string,
  filename: string,
): Promise<ExtractionResult> {
  const errors: string[] = [];

  let raw: RawExtraction | null = null;

  // Primary: native PDF document block (Claude renders the PDF)
  try {
    raw = await extractViaPdf(pdfBuffer, filename);
    console.log('[extractor] PDF extraction succeeded via document block');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[extractor] Document block failed, falling back to text extraction:', msg);
    errors.push(`PDF vision extraction failed (${msg}), fell back to text extraction.`);
  }

  // Fallback: pdf-parse text extraction
  if (!raw) {
    try {
      raw = await extractViaText(pdfBuffer, filename);
      console.log('[extractor] Text fallback extraction succeeded');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[extractor] Both extraction paths failed:', msg);
      errors.push(`Text extraction also failed: ${msg}`);
      return {
        extracted: [],
        lab_source: 'unknown',
        test_date: new Date().toISOString().split('T')[0],
        errors,
      };
    }
  }

  // Flag low-confidence biomarkers
  for (const b of raw.biomarkers) {
    if (b.confidence === 'low') {
      errors.push(`Low confidence: ${b.standardized_name} = ${b.value} ${b.unit} (verify manually)`);
    }
  }
  if (raw.notes) {
    errors.push(raw.notes);
  }

  return {
    extracted: raw.biomarkers,
    lab_source: raw.lab_source ?? 'unknown',
    test_date: raw.test_date_primary ?? new Date().toISOString().split('T')[0],
    errors,
  };
}
