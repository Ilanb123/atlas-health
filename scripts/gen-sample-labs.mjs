import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'sample-labs.pdf');

const doc = new PDFDocument({ size: 'LETTER', margin: 50, bufferPages: true });
doc.pipe(createWriteStream(outPath));

// ── Colours / constants ────────────────────────────────────────────────────────
const C = {
  navy:   '#1a2f5e',
  red:    '#c0392b',
  gray:   '#555555',
  light:  '#f2f4f8',
  border: '#cccccc',
  black:  '#111111',
};

const PAGE_W  = 612 - 100; // usable width (margins 50 each side)
const COL     = [0, 200, 270, 340, 440, 510]; // column x-offsets (relative to margin)

// ── Helpers ───────────────────────────────────────────────────────────────────

function hline(y, color = C.border) {
  doc.save().strokeColor(color).lineWidth(0.5)
     .moveTo(50, y).lineTo(562, y).stroke().restore();
}

function sectionHeader(title) {
  const y = doc.y;
  doc.rect(50, y, PAGE_W, 18).fill(C.navy);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
     .text(title, 56, y + 4, { width: PAGE_W - 12 });
  doc.fillColor(C.black);
  doc.moveDown(0.1);
}

function tableHeader() {
  const y = doc.y;
  doc.rect(50, y, PAGE_W, 15).fill(C.light);
  const hdrs = ['Test Name', 'Value', 'Units', 'Reference Range', 'Flag'];
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.gray);
  hdrs.forEach((h, i) => doc.text(h, 50 + COL[i], y + 3, { width: COL[i + 1] - COL[i] || 60 }));
  doc.fillColor(C.black);
  doc.moveDown(0.15);
  hline(doc.y);
}

function tableRow(name, value, unit, refRange, flag) {
  const y   = doc.y + 2;
  const flagColor = flag === 'H' || flag === 'L' ? C.red : C.gray;

  doc.font('Helvetica').fontSize(8.5).fillColor(C.black);
  doc.text(name,     50 + COL[0], y, { width: COL[1] - COL[0] - 4 });
  doc.text(value,    50 + COL[1], y, { width: COL[2] - COL[1] - 4 });
  doc.text(unit,     50 + COL[2], y, { width: COL[3] - COL[2] - 4 });
  doc.text(refRange, 50 + COL[3], y, { width: COL[4] - COL[3] - 4 });
  doc.fillColor(flag === 'H' || flag === 'L' ? C.red : C.gray)
     .font(flag ? 'Helvetica-Bold' : 'Helvetica')
     .text(flag || '',  50 + COL[4], y, { width: 50 });
  doc.fillColor(C.black);
  doc.moveDown(0.05);
  hline(doc.y);
}

// ── PAGE 1 ────────────────────────────────────────────────────────────────────

// Logo / header bar
doc.rect(50, 40, PAGE_W, 52).fill(C.navy);
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22)
   .text('LabCorp', 60, 50);
doc.font('Helvetica').fontSize(10)
   .text('Patient Laboratory Report', 60, 75);
doc.fillColor(C.black);

// Patient info block
const infoY = 110;
doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text('PATIENT', 50, infoY);
doc.font('Helvetica').fontSize(9).fillColor(C.black)
   .text('Test Patient', 50, infoY + 12);

doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text('DATE OF BIRTH', 200, infoY);
doc.font('Helvetica').fontSize(9).fillColor(C.black).text('2006-03-22', 200, infoY + 12);

doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text('SEX', 320, infoY);
doc.font('Helvetica').fontSize(9).fillColor(C.black).text('Male', 320, infoY + 12);

doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text('SPECIMEN COLLECTED', 400, infoY);
doc.font('Helvetica').fontSize(9).fillColor(C.black).text('2026-04-15', 400, infoY + 12);

doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text('REPORT DATE', 50, infoY + 28);
doc.font('Helvetica').fontSize(9).fillColor(C.black).text('2026-04-17', 50, infoY + 40);

doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text('ORDERING PHYSICIAN', 200, infoY + 28);
doc.font('Helvetica').fontSize(9).fillColor(C.black).text('Dr. Sarah Chen, MD', 200, infoY + 40);

doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text('SPECIMEN ID', 400, infoY + 28);
doc.font('Helvetica').fontSize(9).fillColor(C.black).text('LC-2026-041587234', 400, infoY + 40);

hline(infoY + 56, C.navy);
doc.moveDown(0.5);

// ── CBC ───────────────────────────────────────────────────────────────────────
doc.y = infoY + 66;
sectionHeader('COMPLETE BLOOD COUNT (CBC)');
tableHeader();
tableRow('White Blood Cells (WBC)',   '6.2',  '10³/µL',  '4.5 - 11.0',   '');
tableRow('Red Blood Cells (RBC)',     '5.1',  '10⁶/µL',  '4.7 - 6.1',    '');
tableRow('Hemoglobin',                '15.4', 'g/dL',    '13.5 - 17.5',  '');
tableRow('Hematocrit',                '45.8', '%',       '41.0 - 53.0',  '');
tableRow('MCV',                       '89',   'fL',      '80 - 100',     '');
tableRow('MCH',                       '30.2', 'pg',      '27.0 - 33.0',  '');
tableRow('MCHC',                      '33.5', 'g/dL',    '32.0 - 36.0',  '');
tableRow('Platelets',                 '238',  '10³/µL',  '150 - 400',    '');
tableRow('Neutrophils',               '58',   '%',       '45 - 74',      '');
tableRow('Lymphocytes',               '34',   '%',       '16 - 45',      '');
tableRow('Monocytes',                 '6',    '%',       '4 - 11',       '');
tableRow('Eosinophils',               '2',    '%',       '0 - 7',        '');
tableRow('Basophils',                 '0',    '%',       '0 - 2',        '');

// ── CMP ──────────────────────────────────────────────────────────────────────
doc.moveDown(0.6);
sectionHeader('COMPREHENSIVE METABOLIC PANEL (CMP)');
tableHeader();
tableRow('Glucose',                   '88',   'mg/dL',   '70 - 99',      '');
tableRow('Blood Urea Nitrogen (BUN)', '14',   'mg/dL',   '7 - 25',       '');
tableRow('Creatinine',                '0.97', 'mg/dL',   '0.74 - 1.35',  '');
tableRow('eGFR (Non-African Am.)',    '>60',  'mL/min',  '>60',          '');
tableRow('Sodium',                    '140',  'mmol/L',  '136 - 145',    '');
tableRow('Potassium',                 '4.1',  'mmol/L',  '3.5 - 5.1',    '');
tableRow('Chloride',                  '103',  'mmol/L',  '98 - 107',     '');
tableRow('CO2 / Bicarbonate',         '25',   'mmol/L',  '22 - 29',      '');
tableRow('Calcium',                   '9.4',  'mg/dL',   '8.6 - 10.2',   '');
tableRow('Total Protein',             '7.2',  'g/dL',    '6.1 - 8.1',    '');
tableRow('Albumin',                   '4.5',  'g/dL',    '3.6 - 5.1',    '');
tableRow('Total Bilirubin',           '0.7',  'mg/dL',   '0.2 - 1.2',    '');
tableRow('AST (SGOT)',                '22',   'U/L',     '10 - 40',      '');
tableRow('ALT (SGPT)',                '18',   'U/L',     '7 - 56',       '');
tableRow('Alkaline Phosphatase',      '72',   'U/L',     '44 - 147',     '');

// ── PAGE 2 ────────────────────────────────────────────────────────────────────
doc.addPage();

// Continuation header
doc.rect(50, 40, PAGE_W, 30).fill(C.navy);
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
   .text('LabCorp — Patient Report (continued)', 60, 50);
doc.fillColor(C.black);
doc.y = 84;

// ── Lipid Panel ───────────────────────────────────────────────────────────────
doc.moveDown(0.4);
sectionHeader('LIPID PANEL');
tableHeader();
tableRow('Total Cholesterol',         '192',  'mg/dL',  '<200',         '');
tableRow('LDL Cholesterol',           '118',  'mg/dL',  '<100',         'H');
tableRow('HDL Cholesterol',           '52',   'mg/dL',  '>40',          '');
tableRow('Triglycerides',             '108',  'mg/dL',  '<150',         '');
tableRow('Non-HDL Cholesterol',       '140',  'mg/dL',  '<130',         'H');
tableRow('Total Chol / HDL Ratio',    '3.7',  'ratio',  '<5.0',         '');

// ── Thyroid ───────────────────────────────────────────────────────────────────
doc.moveDown(0.6);
sectionHeader('THYROID PANEL');
tableHeader();
tableRow('TSH (Thyroid Stimulating Hormone)', '1.82', 'mIU/L',  '0.45 - 4.50', '');
tableRow('Free T4 (Thyroxine, Free)',          '1.1',  'ng/dL',  '0.82 - 1.77', '');
tableRow('Free T3 (Triiodothyronine, Free)',   '3.2',  'pg/mL',  '2.0 - 4.4',   '');

// ── Vitamin D ─────────────────────────────────────────────────────────────────
doc.moveDown(0.6);
sectionHeader('VITAMINS & MINERALS');
tableHeader();
tableRow('Vitamin D, 25-Hydroxyvitamin D',    '28',   'ng/mL',  '30 - 100',    'L');
tableRow('Ferritin',                           '45',   'ng/mL',  '24 - 336',    '');
tableRow('Iron, Serum',                        '88',   'µg/dL',  '65 - 175',    '');
tableRow('TIBC',                               '310',  'µg/dL',  '250 - 370',   '');
tableRow('Iron Saturation',                    '28',   '%',      '20 - 55',     '');

// ── Interpretation note ───────────────────────────────────────────────────────
doc.moveDown(0.8);
doc.rect(50, doc.y, PAGE_W, 1).fill(C.navy);
doc.moveDown(0.2);

doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.navy)
   .text('INTERPRETATION NOTES', 50, doc.y + 4);
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(8).fillColor(C.gray)
   .text(
     'H = Above reference range (High).  L = Below reference range (Low).  ' +
     'Reference ranges are age- and sex-adjusted where applicable.\n' +
     'LDL Cholesterol is calculated using the Friedewald equation. ' +
     'Please review results with your healthcare provider.',
     50, doc.y, { width: PAGE_W }
   );

// ── Footer both pages ─────────────────────────────────────────────────────────
const totalPages = 2;
[1, 2].forEach(pg => {
  doc.switchToPage(pg - 1);
  const footY = 740;
  hline(footY, C.navy);
  doc.font('Helvetica').fontSize(7.5).fillColor(C.gray)
     .text(
       'LabCorp · 531 South Spring Street · Burlington, NC 27215 · 1-800-222-7566 · labcorp.com',
       50, footY + 6, { align: 'center', width: PAGE_W }
     )
     .text(
       `Confidential Patient Report · Page ${pg} of ${totalPages} · Specimen ID: LC-2026-041587234`,
       50, footY + 16, { align: 'center', width: PAGE_W }
     );
});

doc.end();
console.log('Written to:', outPath);
