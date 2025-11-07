import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
     reactStrictMode: true,
     // Allow cross-origin requests from specific IP addresses for development
     allowedDevOrigins: [
          '192.168.1.173'
     ],
     // Exclude markdown files and documentation from being processed
     pageExtensions: ['js', 'jsx', 'ts', 'tsx'],

     webpack: (config, { isServer, webpack }) => {
          // Configure webpack to ignore plugin node_modules directories
          // This prevents webpack from scanning binary files and dependencies in symlinked plugin directories
          const existingIgnored = config.watchOptions?.ignored;
          const existingIgnoredArray = Array.isArray(existingIgnored)
               ? existingIgnored.filter(item => item && item.length > 0)  // Filter out empty strings
               : existingIgnored
                    ? [existingIgnored].filter(item => item && item.length > 0)
                    : [];

          config.watchOptions = {
               ...config.watchOptions,
               ignored: [
                    ...existingIgnoredArray,
                    '**/plugins/**/node_modules/**',
                    '**/bb-plugins/**/node_modules/**',
               ],
          };

          // Use ContextReplacementPlugin to limit the scope of the dynamic import lazy context
          // This prevents webpack from creating a context that includes node_modules or other non-source files
          config.plugins.push(
               new webpack.ContextReplacementPlugin(
                    // Match any context module that includes 'bb-plugins' in its path
                    /bb-plugins/,
                    (context) => {
                         // ONLY match client sidebar components in pages/client/ subdirectory
                         // This prevents webpack from trying to compile admin pages or other unrelated files
                         // Regex matches: ./plugin-name/nextjs/pages/client/ComponentName.js
                         context.regExp = /^\.\/[^/]+\/nextjs\/pages\/client\/.*\.(jsx?|tsx?)$/;
                    }
               )
          );

          // Explicitly ignore node_modules directories within plugins during module resolution
          config.plugins.push(
               new webpack.IgnorePlugin({
                    checkResource: (resource, context) => {
                         // Ignore any imports from plugin node_modules directories
                         if (context && (context.includes('/plugins/') || context.includes('/bb-plugins/'))) {
                              return resource.includes('node_modules');
                         }
                         return false;
                    }
               })
          );

          // Add webpack alias to resolve bb-plugins directory
          config.resolve.alias = {
               ...config.resolve.alias,
               'bb-plugins': path.resolve(__dirname, '../bb-plugins'),
          };

          // Add externals pattern to prevent webpack from bundling plugin node_modules
          if (!isServer) {
               // On client side, explicitly ignore any requires from plugin node_modules
               const originalExternals = config.externals || [];
               config.externals = [
                    ...( Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
                    function({ context, request }, callback) {
                         // Ignore any imports from plugin node_modules
                         if (request && (request.includes('/plugins/') || request.includes('/bb-plugins/')) &&
                             request.includes('/node_modules/')) {
                              return callback(null, `commonjs ${request}`);
                         }
                         callback();
                    },
               ];
          }

          // Comprehensive exclusion list for non-compilable files in plugin directories
          // Includes: binary/database, documentation, source maps, images, video, audio, archives, lock/log files
          config.module.rules.push({
               test: /\.(sqlite3?|db|bin|exe|dll|so|dylib|md|txt|pdf|docx?|map|png|jpe?g|gif|svg|webp|ico|bmp|mp4|avi|mov|wmv|flv|webm|mp3|wav|ogg|flac|aac|zip|tar|gz|rar|7z|lock|log)$/,
               type: 'asset/resource',
               generator: {
                    emit: false,
               },
          });

          // Module resolution uses main nextjs-app node_modules
          config.resolve.modules = [
               ...(config.resolve.modules || []),
               'node_modules',
          ];

          // Prevent ESLint and other Node.js modules from being bundled on client side
          if (!isServer) {
               config.resolve.fallback = {
                    ...config.resolve.fallback,
                    fs: false,
                    module: false,
                    path: false,
               };

               config.resolve.alias = {
                    ...config.resolve.alias,
                    '@eslint/eslintrc': false,
                    'resolve-from': false,
                    'import-fresh': false,
               };
          }

          return config;
     },
};

export default nextConfig;
