const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

/**
 * TextExtractor - Universal Text Extraction Service
 *
 * Supports Phase 1 "Core 6" file formats for MVP:
 * - Plain text (.txt, .md)
 * - PDF (.pdf) - via pdf-parse
 * - Microsoft Word (.docx) - via mammoth
 * - HTML (.html, .htm) - via cheerio
 * - CSV (.csv) - via csv-parser
 *
 * Architecture:
 * - Single extraction interface: extract(filePath, mimeType)
 * - Format-specific methods for each file type
 * - Clean separation of concerns for easy extension
 *
 * Future (Phase 2+):
 * - RTF, EPUB, PPTX support
 * - OCR for images (not in MVP)
 * - Audio transcription (not in MVP)
 */
class TextExtractorService {
    /**
     * Main extraction entry point - automatically detects file type and extracts text
     * @param {string} filePath - Absolute path to the file
     * @param {string} mimeType - MIME type of the file (optional, will use extension if not provided)
     * @returns {Promise<string>} - Extracted plain text content
     */
    async extract(filePath, mimeType = null) {
        const ext = path.extname(filePath).toLowerCase();

        console.log(`📄 Extracting text from ${ext} file: ${path.basename(filePath)}`);

        try {
            switch (ext) {
                case '.txt':
                case '.md':
                case '.markdown':
                    return await this.extractPlainText(filePath);

                case '.pdf':
                    return await this.extractPDF(filePath);

                case '.docx':
                    return await this.extractDocx(filePath);

                case '.html':
                case '.htm':
                    return await this.extractHTML(filePath);

                case '.csv':
                    return await this.extractCSV(filePath);

                default:
                    throw new Error(`Unsupported file type: ${ext}. Supported formats: .txt, .md, .pdf, .docx, .html, .csv`);
            }
        } catch (error) {
            console.error(`❌ Error extracting text from ${ext} file:`, error.message);
            throw new Error(`Failed to extract text from ${ext} file: ${error.message}`);
        }
    }

    /**
     * Extract text from plain text files (.txt, .md, .markdown)
     * @param {string} filePath - Path to text file
     * @returns {Promise<string>} - File contents as UTF-8 text
     */
    async extractPlainText(filePath) {
        const text = await fs.readFile(filePath, 'utf-8');
        console.log(`   ✓ Extracted ${text.length} characters from plain text file`);
        return text;
    }

    /**
     * Extract text from PDF files using pdf-parse
     * @param {string} filePath - Path to PDF file
     * @returns {Promise<string>} - Extracted text from all pages
     */
    async extractPDF(filePath) {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(dataBuffer);

        const text = pdfData.text || '';
        const pageCount = pdfData.numpages || 0;

        console.log(`   ✓ Extracted ${text.length} characters from PDF (${pageCount} pages)`);

        if (!text || text.trim().length === 0) {
            throw new Error('PDF appears to be empty or contains only images (OCR not supported in MVP)');
        }

        return text;
    }

    /**
     * Extract text from Microsoft Word documents (.docx) using mammoth
     * @param {string} filePath - Path to DOCX file
     * @returns {Promise<string>} - Extracted text content
     */
    async extractDocx(filePath) {
        const dataBuffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });

        const text = result.value || '';
        const messages = result.messages || [];

        // Log any warnings from mammoth (non-fatal)
        if (messages.length > 0) {
            console.warn(`   ⚠️  DOCX extraction warnings:`, messages.map(m => m.message).join(', '));
        }

        console.log(`   ✓ Extracted ${text.length} characters from DOCX`);

        if (!text || text.trim().length === 0) {
            throw new Error('DOCX file appears to be empty');
        }

        return text;
    }

    /**
     * Extract text from HTML files using cheerio
     * Removes scripts, styles, and HTML tags to get clean text
     * @param {string} filePath - Path to HTML file
     * @returns {Promise<string>} - Extracted text content
     */
    async extractHTML(filePath) {
        const html = await fs.readFile(filePath, 'utf-8');
        const $ = cheerio.load(html);

        // Remove script and style tags entirely
        $('script').remove();
        $('style').remove();

        // Extract text from body (or entire document if no body)
        const text = $('body').length > 0
            ? $('body').text()
            : $.root().text();

        // Clean up whitespace
        const cleanText = text
            .replace(/\s+/g, ' ')
            .trim();

        console.log(`   ✓ Extracted ${cleanText.length} characters from HTML`);

        if (!cleanText || cleanText.trim().length === 0) {
            throw new Error('HTML file appears to be empty or contains no readable text');
        }

        return cleanText;
    }

    /**
     * Extract text from CSV files
     * Converts structured data into searchable text by joining all values
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<string>} - Text representation of CSV data
     */
    async extractCSV(filePath) {
        return new Promise((resolve, reject) => {
            let textLines = [];
            let rowCount = 0;
            let headers = null;

            createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    rowCount++;

                    // Store headers from first row
                    if (!headers) {
                        headers = Object.keys(row);
                    }

                    // Convert each row to "key: value" pairs for better semantic search
                    const rowText = Object.entries(row)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');

                    textLines.push(rowText);
                })
                .on('end', () => {
                    const text = textLines.join('\n');
                    console.log(`   ✓ Extracted ${text.length} characters from CSV (${rowCount} rows, ${headers?.length || 0} columns)`);

                    if (!text || text.trim().length === 0) {
                        reject(new Error('CSV file appears to be empty'));
                    } else {
                        resolve(text);
                    }
                })
                .on('error', (error) => {
                    reject(new Error(`Failed to parse CSV: ${error.message}`));
                });
        });
    }

    /**
     * Get a list of all supported file extensions
     * @returns {string[]} - Array of supported extensions (with dots)
     */
    getSupportedExtensions() {
        return ['.txt', '.md', '.markdown', '.pdf', '.docx', '.html', '.htm', '.csv'];
    }

    /**
     * Check if a file type is supported
     * @param {string} filename - Filename or extension to check
     * @returns {boolean} - True if supported
     */
    isSupported(filename) {
        const ext = path.extname(filename).toLowerCase();
        return this.getSupportedExtensions().includes(ext);
    }

    /**
     * Get human-readable list of supported formats
     * @returns {string} - Comma-separated list of formats
     */
    getSupportedFormatsString() {
        return 'Plain text (.txt, .md), PDF (.pdf), Word documents (.docx), HTML (.html), CSV (.csv)';
    }
}

module.exports = TextExtractorService;
