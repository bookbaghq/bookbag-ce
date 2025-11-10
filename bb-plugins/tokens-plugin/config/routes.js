/**
 * Tokens Plugin Routes Configuration
 * Registers API endpoints for token analytics and settings
 */

var master = require('mastercontroller');
var router = master.router.start();

// Token Analytics routes
router.route('bb-tokens/api/tokens/analytics', 'api/tokens#getAnalytics', 'get');
router.route('bb-tokens/api/tokens/user-stats', 'api/tokens#getUserStats', 'get');
router.route('bb-tokens/api/tokens/recent-activity', 'api/tokens#getRecentActivity', 'get');

// Settings routes
router.route('bb-tokens/api/settings', 'api/settings#getSettings', 'get');
router.route('bb-tokens/api/settings', 'api/settings#updateSettings', 'post');
router.route('bb-tokens/api/settings/check-limits', 'api/settings#checkLimits', 'get');

console.log('✓ Tokens plugin routes registered successfully');
