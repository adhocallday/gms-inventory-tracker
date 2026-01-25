#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function testParsePDF() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node test-pdf-parse-local.js <doc-type> <pdf-file-path>');
    console.error('');
    console.error('Doc types: po, packing-list, sales-report, settlement');
    console.error('Example: node test-pdf-parse-local.js sales-report ./ghosttrackers/Baltimore_Sales.pdf');
    process.exit(1);
  }

  const [docType, pdfPath] = args;
  const validTypes = ['po', 'packing-list', 'sales-report', 'settlement'];

  if (!validTypes.includes(docType)) {
    console.error(`Invalid doc type: ${docType}`);
    console.error(`Must be one of: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`);
    process.exit(1);
  }

  console.log('📄 Testing PDF parsing locally...');
  console.log(`   Doc Type: ${docType}`);
  console.log(`   File: ${pdfPath}`);
  console.log('');

  try {
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileName = path.basename(pdfPath);

    // Create a Blob from the buffer (Node 18+ has Blob)
    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });

    // Use the global FormData (available in Node 18+)
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('tourId', '123e4567-e89b-12d3-a456-426614174000'); // Ghost tour ID

    console.log('🚀 Sending to local API...');
    const response = await fetch(`http://localhost:3000/api/parse/${docType}`, {
      method: 'POST',
      body: formData,
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    console.log('');

    // Read response as text first, then try to parse as JSON
    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('❌ Failed to parse response as JSON');
      console.error('');
      console.error('Raw response (first 1000 chars):');
      console.error(responseText.substring(0, 1000));
      console.error('');
      console.error('JSON parse error:', jsonError.message);
      process.exit(1);
    }

    if (response.ok) {
      console.log('✅ SUCCESS!');
      console.log('');
      console.log('Parsed document ID:', result.parsedDocumentId);
      console.log('Status:', result.status);
      console.log('');

      if (result.validation?.missing_fields?.length) {
        console.log('⚠️  Missing fields:', result.validation.missing_fields.join(', '));
      }

      if (result.validation?.warnings?.length) {
        console.log('⚠️  Warnings:');
        result.validation.warnings.forEach(w => console.log(`   - ${w}`));
      }

      console.log('');
      console.log('Normalized data:');
      console.log(JSON.stringify(result.normalized_json, null, 2));

      console.log('');
      console.log('📝 View in browser:');
      console.log(`   http://localhost:3000/dashboard/parsed-documents/${result.parsedDocumentId}`);
    } else {
      console.log('❌ PARSING FAILED');
      console.log('');
      console.log('Error:', result.error);
      console.log('Details:', result.details);

      if (result.docType) {
        console.log('Doc Type:', result.docType);
      }
      if (result.fileName) {
        console.log('File Name:', result.fileName);
      }

      console.log('');
      console.log('💡 Check server logs above for detailed error output');
      console.log('   The server console should show:');
      console.log('   - Full Claude API response');
      console.log('   - JSON extraction details');
      console.log('   - Stack traces');
    }

  } catch (error) {
    console.error('❌ Test failed with exception:');
    console.error(error.message);
    console.error('');
    console.error('Full error:');
    console.error(error);
    process.exit(1);
  }
}

testParsePDF();
