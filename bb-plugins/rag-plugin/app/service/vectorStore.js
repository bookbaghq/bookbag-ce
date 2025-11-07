/**
 * VectorStore - LanceDB Vector Database Management
 *
 * Handles:
 * - LanceDB connection initialization
 * - Table creation per tenant
 * - Vector storage and retrieval
 * - ANN (Approximate Nearest Neighbor) search
 *
 * LanceDB is an embedded vector database that provides:
 * - Fast ANN search
 * - Local-first architecture (like SQLite)
 * - Metadata filtering
 * - Scalable performance
 */

const lancedb = require('@lancedb/lancedb');
const path = require('path');

let db = null;

/**
 * Get or create LanceDB connection
 * @returns {Promise<Connection>} - LanceDB connection
 */
async function getVectorDB() {
    if (!db) {
        // Use storage/vectors/ for LanceDB data
        const vectorPath = path.join(process.cwd(), 'storage', 'vectors');
        console.log(`📊 Initializing LanceDB at: ${vectorPath}`);

        db = await lancedb.connect(vectorPath);
        console.log('✅ LanceDB connected successfully');
    }
    return db;
}

/**
 * Get or create a table for a specific tenant
 * @param {string} tenantId - Tenant/user ID
 * @returns {Promise<Table>} - LanceDB table
 */
async function getTenantTable(tenantId) {
    const db = await getVectorDB();
    const tableName = `tenant_${tenantId}`;

    try {
        // Try to open existing table
        const table = await db.openTable(tableName);
        console.log(`✓ Opened existing table: ${tableName}`);
        return table;
    } catch (error) {
        // Table doesn't exist, create it
        console.log(`📝 Creating new table: ${tableName}`);

        // Create table with schema
        // Note: LanceDB Node.js requires an initial data array
        const table = await db.createTable(tableName, [], {
            mode: 'create'
        });

        console.log(`✅ Created table: ${tableName}`);
        return table;
    }
}

/**
 * Add vectors to a tenant's table
 * @param {string} tenantId - Tenant/user ID
 * @param {Array} rows - Array of objects with: chunk_id, document_id, content, vector
 * @returns {Promise<void>}
 */
async function addVectors(tenantId, rows) {
    const table = await getTenantTable(tenantId);

    if (rows.length === 0) {
        console.log('⚠️  No rows to add');
        return;
    }

    console.log(`📥 Adding ${rows.length} vectors to ${tenantId} table`);
    await table.add(rows);
    console.log(`✅ Vectors added successfully`);
}

/**
 * Search for similar vectors using ANN
 * @param {string} tenantId - Tenant/user ID
 * @param {number[]} queryVector - Query embedding vector
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} - Search results
 */
async function searchVectors(tenantId, queryVector, limit = 5) {
    const table = await getTenantTable(tenantId);

    console.log(`🔍 Searching ${tenantId} table with limit ${limit}`);

    // Perform ANN search
    const results = await table
        .search(queryVector)
        .limit(limit)
        .execute();

    console.log(`✅ Found ${results.length} results`);
    return results;
}

/**
 * Delete all vectors for a specific document
 * @param {string} tenantId - Tenant/user ID
 * @param {number} documentId - Document ID
 * @returns {Promise<void>}
 */
async function deleteDocumentVectors(tenantId, documentId) {
    const table = await getTenantTable(tenantId);

    console.log(`🗑️  Deleting vectors for document ${documentId} in ${tenantId} table`);

    // LanceDB delete uses SQL-like WHERE clause
    await table.delete(`document_id = ${documentId}`);

    console.log(`✅ Vectors deleted`);
}

/**
 * Get table statistics
 * @param {string} tenantId - Tenant/user ID
 * @returns {Promise<object>} - Table stats
 */
async function getTableStats(tenantId) {
    try {
        const table = await getTenantTable(tenantId);
        const count = await table.countRows();

        return {
            tableName: `tenant_${tenantId}`,
            rowCount: count,
            exists: true
        };
    } catch (error) {
        return {
            tableName: `tenant_${tenantId}`,
            rowCount: 0,
            exists: false
        };
    }
}

/**
 * Close database connection
 */
async function closeDB() {
    if (db) {
        console.log('🔒 Closing LanceDB connection');
        db = null;
    }
}

module.exports = {
    getVectorDB,
    getTenantTable,
    addVectors,
    searchVectors,
    deleteDocumentVectors,
    getTableStats,
    closeDB
};
