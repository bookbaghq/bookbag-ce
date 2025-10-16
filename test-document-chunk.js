// Test script to verify DocumentChunk model behavior
const DocumentChunkModel = require('./components/rag/app/models/documentChunk');

console.log('Testing DocumentChunk model instantiation...');

const chunk = new DocumentChunkModel();
console.log('✓ Created new DocumentChunkModel instance');

// Test setting document_id
chunk.document_id = 123;
console.log(`✓ Set document_id = 123`);
console.log(`  → chunk.document_id value: ${chunk.document_id}`);
console.log(`  → chunk object keys:`, Object.keys(chunk));
console.log(`  → chunk object:`, JSON.stringify(chunk, null, 2));

// Test if it's undefined
if (!chunk.document_id) {
    console.error('❌ PROBLEM: document_id is undefined after setting!');
} else {
    console.log('✓ document_id is properly set');
}
