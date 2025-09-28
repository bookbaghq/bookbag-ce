/**
 * HTML Utilities for Chat Interface
 * Handles HTML sanitization and rendering detection
 */

/**
 * HTML Sanitization utility - simple whitelist approach for security
 * @param {string} html - Raw HTML string to sanitize
 * @returns {string} - Sanitized HTML string
 */
export function sanitizeHTML(html) {
  // Only allow specific safe HTML tags and attributes for citations and basic formatting
  const allowedTags = ['sup', 'span', 'strong', 'em', 'b', 'i', 'u', 'br', 'p', 'div'];
  const allowedAttributes = ['id', 'class', 'data-citation'];
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Function to clean a node recursively
  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
      // Check if tag is allowed
      if (!allowedTags.includes(tagName)) {
        // Replace disallowed tags with their text content
        return node.textContent;
      }
      
      // Create clean element
      const cleanElement = document.createElement(tagName);
      
      // Copy allowed attributes
      for (const attr of node.attributes) {
        if (allowedAttributes.includes(attr.name.toLowerCase())) {
          // Additional validation for specific attributes
          if (attr.name === 'class') {
            // Only allow specific citation-related classes
            const safeClasses = attr.value.split(' ').filter(cls => 
              cls.match(/^(text-citation|citation|reference|footnote|superscript)$/)
            );
            if (safeClasses.length > 0) {
              cleanElement.setAttribute(attr.name, safeClasses.join(' '));
            }
          } else if (attr.name === 'id') {
            // Sanitize ID to prevent XSS
            const safeId = attr.value.replace(/[^a-zA-Z0-9_-]/g, '');
            if (safeId) {
              cleanElement.setAttribute(attr.name, safeId);
            }
          } else {
            cleanElement.setAttribute(attr.name, attr.value);
          }
        }
      }
      
      // Recursively clean children
      for (const child of node.childNodes) {
        const cleanedChild = cleanNode(child);
        if (typeof cleanedChild === 'string') {
          cleanElement.appendChild(document.createTextNode(cleanedChild));
        } else {
          cleanElement.appendChild(cleanedChild);
        }
      }
      
      return cleanElement;
    }
    
    return '';
  }
  
  // Clean all child nodes
  const fragment = document.createDocumentFragment();
  for (const child of tempDiv.childNodes) {
    const cleanedChild = cleanNode(child);
    if (typeof cleanedChild === 'string') {
      fragment.appendChild(document.createTextNode(cleanedChild));
    } else {
      fragment.appendChild(cleanedChild);
    }
  }
  
  // Return the cleaned HTML
  const cleanDiv = document.createElement('div');
  cleanDiv.appendChild(fragment);
  return cleanDiv.innerHTML;
}

/**
 * Check if content contains HTML that should be rendered
 * @param {string} content - Content to check
 * @returns {boolean} - True if content contains renderable HTML
 */
export function containsRenderableHTML(content) {
  if (!content) return false;
  
  // Check for specific HTML patterns we want to render
  const htmlPatterns = [
    /<sup[^>]*>.*?<\/sup>/i,           // Superscript tags
    /<span[^>]*class[^>]*citation[^>]*>.*?<\/span>/i,  // Citation spans
    /<span[^>]*class[^>]*reference[^>]*>.*?<\/span>/i, // Reference spans
    /<strong>.*?<\/strong>/i,          // Bold text
    /<em>.*?<\/em>/i,                  // Italic text
    /<b>.*?<\/b>/i,                    // Bold tags
    /<i>.*?<\/i>/i                     // Italic tags
  ];
  
  return htmlPatterns.some(pattern => pattern.test(content));
}
