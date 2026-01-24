import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/client';
import { parsePurchaseOrder } from '@/lib/ai/parsers/po-parser';
import { parsePackingList } from '@/lib/ai/parsers/packing-list-parser';
import { parseSalesReport } from '@/lib/ai/parsers/sales-report-parser';
import { parseSettlementReport } from '@/lib/ai/parsers/settlement-parser';

export async function POST(request: NextRequest) {
  try {
    const { filePath, fileType, tourId } = await request.json();
    
    if (!filePath || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: filePath, fileType' },
        { status: 400 }
      );
    }
    
    const supabase = createServiceClient();
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath);
    
    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'File not found or download failed', details: downloadError },
        { status: 404 }
      );
    }
    
    // Convert to base64 + hash for idempotency
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const base64 = buffer.toString('base64');
    const sourceHash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Parse based on file type
    let parsed;
    let logId;
    
    // Log start of processing
    const { data: logEntry } = await supabase
      .from('ai_processing_logs')
      .insert({
        doc_type: fileType,
        source_hash: sourceHash,
        source_filename: filePath,
        status: 'processing'
      })
      .select()
      .single();
    
    logId = logEntry?.id;
    
    try {
      switch (fileType) {
        case 'po':
          parsed = await parsePurchaseOrder(base64);
          break;
        case 'packing-list':
          parsed = await parsePackingList(base64);
          break;
        case 'sales-report':
          parsed = await parseSalesReport(base64);
          break;
        case 'settlement':
          parsed = await parseSettlementReport(base64);
          break;
        default:
          throw new Error(`Unknown file type: ${fileType}`);
      }
      
      // Upsert draft parsed document
      const { data: parsedDoc } = await supabase
        .from('parsed_documents')
        .upsert(
          {
            doc_type: fileType,
            source_hash: sourceHash,
            source_filename: filePath,
            tour_id: tourId ?? null,
            extracted_json: parsed,
            normalized_json: parsed,
            status: 'draft'
          },
          { onConflict: 'doc_type,source_hash' }
        )
        .select()
        .single();

      // Update log with success
      if (logId) {
        await supabase
          .from('ai_processing_logs')
          .update({
            status: 'ok',
            parsed_json: parsed
          })
          .eq('id', logId);
      }
      
      return NextResponse.json({
        success: true,
        data: parsed,
        fileType,
        parsedDocumentId: parsedDoc?.id ?? null
      });
      
    } catch (parseError: any) {
      // Update log with failure
      if (logId) {
        await supabase
          .from('ai_processing_logs')
          .update({
            status: 'error',
            error_message: parseError.message
          })
          .eq('id', logId);
      }
      
      throw parseError;
    }
    
  } catch (error: any) {
    console.error('Parse document error:', error);
    return NextResponse.json(
      { error: 'Failed to parse document', details: error.message },
      { status: 500 }
    );
  }
}
