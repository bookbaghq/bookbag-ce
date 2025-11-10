/**
 * Plugins Component
 * Manages plugin installation, activation, and configuration
 */

var master = require('mastercontroller');

class PluginsComponent {
  constructor() {
    this.name = 'plugins';
  }

  load(params) {
    // Load component configuration
    if (params) {
      master.cors.load(params);
      master.router.load(params);
    }
  }
}

module.exports = new PluginsComponent();
