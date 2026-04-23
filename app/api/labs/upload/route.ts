import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractBiomarkersFromPDF } from '@/lib/biomarkers/extractor';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('atlas_user_id')?.value;

  if (!userId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return Response.json({ error: 'Only PDF files are accepted' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: 'File size exceeds 10 MB limit' }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: 'File is empty' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log(`[labs/upload] user=${userId} file=${file.name} size=${file.size}`);

  const { extracted, lab_source, test_date, errors } = await extractBiomarkersFromPDF(
    buffer,
    userId,
    file.name,
  );

  console.log(`[labs/upload] extracted ${extracted.length} biomarkers, ${errors.length} errors`);

  let savedCount = 0;
  if (extracted.length > 0) {
    const rows = extracted.map(b => ({
      user_id: userId,
      name: b.standardized_name,
      value: b.value,
      unit: b.unit,
      reference_range_low: b.reference_range_low ?? null,
      reference_range_high: b.reference_range_high ?? null,
      reference_range_label: b.reference_range_label,
      test_date: b.test_date || test_date,
      lab_source,
      source_pdf_filename: file.name,
      category: b.category,
      raw_extraction: { original_name: b.name, confidence: b.confidence },
    }));

    const { error: upsertError, data } = await supabase
      .from('biomarkers')
      .upsert(rows, { onConflict: 'user_id,name,test_date' })
      .select('id');

    if (upsertError) {
      console.error('[labs/upload] upsert error:', upsertError);
      errors.push(`Database save error: ${upsertError.message}`);
    } else {
      savedCount = data?.length ?? rows.length;
    }
  }

  return Response.json({
    count: savedCount,
    biomarkers: extracted,
    errors,
    preview: extracted.slice(0, 5),
    lab_source,
    test_date,
  });
}
