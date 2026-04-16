const sanitizeHtml = require('sanitize-html');

const sanitizeOptions = {
  allowedTags: ['p', 'ul', 'li', 'ol', 'strong', 'em', 'b', 'i', 'u', 'a', 'h2', 'h3', 'br', 'span'],
  allowedAttributes: {
    'a': ['href', 'target', 'rel'],
    'span': ['class']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  encodeEntities: false,
  transformTags: {
    'a': (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    })
  }
};

const sanitizeMissedReason = (html) => {
  if (!html || typeof html !== 'string') return '';
  const stripped = html.replace(/<[^>]*>/g, '');
  if (stripped.trim().length < 3) {
    return null;
  }
  if (stripped.length > 2000) {
    return null;
  }
  return sanitizeHtml(html, sanitizeOptions);
};

module.exports = { sanitizeMissedReason };
