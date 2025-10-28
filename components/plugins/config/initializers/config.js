/**
 * Plugins Component Initializer
 * Initializes the hook system and loads active plugins
 * This file is called by master.component("components", "plugins")
 */

const master = require('mastercontroller');
const path = require('path');

// Get the sidebar hook system
const sidebarHook = require('../../app/hooks/sidebarHook');

// Get the main plugin loader
const pluginLoader = require('../../app/core/pluginLoader');


// Register the sidebar hook system
console.log('📋 Registering sidebar hook...');
pluginLoader.hook(sidebarHook);

pluginLoader.loadActivePlugins();

// Make pluginLoader available to all controllers (it's already an instance)
master.register("pluginLoader", pluginLoader);
console.log('✓ Plugin loader registered with master');

// NOTE: Plugins will be loaded after all components are initialized
// See config/initializers/config.js at the end


