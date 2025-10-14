
//an example of using a slug
//router.route("/controller/action/:slug", "/controller/action", "get");

var master = require('mastercontroller')
var router = master.router.start(); // should get location from calling function

// RAG (Retrieval-Augmented Generation) API routes
// Upload and ingest a document
router.route("bb-rag/api/rag/ingest", "api/rag#ingestDocument", "post");

// Ingest content from a URL
router.route("bb-rag/api/rag/ingest-url", "api/rag#ingestUrl", "post");

// List all documents for the current tenant
router.route("bb-rag/api/rag/list", "api/rag#listDocuments", "get");

// Query the knowledge base
router.route("bb-rag/api/rag/query", "api/rag#queryKnowledgeBase", "post");

// Get storage usage statistics
router.route("bb-rag/api/rag/storage/usage", "api/rag#getStorageUsage", "get");

// Get knowledge base statistics
router.route("bb-rag/api/rag/stats", "api/rag#getStats", "get");

// Delete a document by ID (must come after other routes to avoid catching them)
router.route("bb-rag/api/rag/delete/:id", "api/rag#deleteDocument", "delete");

// RAG Settings routes
router.route("bb-rag/api/rag/settings", "api/ragSettings#getSettings", "get");
router.route("bb-rag/api/rag/settings", "api/ragSettings#updateSettings", "post");
