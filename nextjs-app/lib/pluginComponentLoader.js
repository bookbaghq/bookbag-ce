/**
 * Plugin Component Loader
 * Provides access to statically imported plugin components
 *
 * This uses the auto-generated loader from plugins-loader/loader.js
 * which contains static imports of all plugin components.
 */

'use client';

import { pluginComponents, getPluginComponent, getComponentsByUsage, getComponentNames } from '../plugins-loader/loader';

/**
 * Get a plugin component by name
 * @param {string} name - Component name
 * @returns {Object|null} Component info with React component
 */
export function getComponent(name) {
  return getPluginComponent(name);
}

/**
 * Get all components for a specific usage type
 * @param {string} usage - Usage type (e.g., "sidebar-left")
 * @returns {Array} Array of component info objects
 */
export function getComponentsForUsage(usage) {
  return getComponentsByUsage(usage);
}

/**
 * Get all available plugin components
 * @returns {Object} Map of component names to component info
 */
export function getAllComponents() {
  return pluginComponents;
}

/**
 * Get list of all component names
 * @returns {Array<string>} Array of component names
 */
export function getAvailableComponentNames() {
  return getComponentNames();
}

/**
 * Check if a component is available
 * @param {string} name - Component name
 * @returns {boolean}
 */
export function hasComponent(name) {
  return getPluginComponent(name) !== null;
}
