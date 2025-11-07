var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// index.js
var require_rag_plugin = __commonJS({
  "index.js"(exports, module) {
    function load(pluginAPI) {
      const { hookService, HOOKS, registerView, registerClientComponent } = pluginAPI;
      const path = __require("path");
      const master = __require("mastercontroller");
      try {
        console.log("  \u2713 Registering RAG plugin as MasterController component");
        master.component("bb-plugins", "rag-plugin");
      } catch (error) {
        console.error("  \u2717 Failed to register plugin as component:", error.message);
      }
      try {
        console.log("  \u2713 Registering RAG plugin admin views");
        registerView("rag-settings", "pages/admin/rag/settings/page", {
          title: "RAG Settings",
          capability: "manage_options",
          icon: "settings"
        });
        registerView("rag-documents", "pages/admin/rag/documents/page", {
          title: "RAG Documents",
          capability: "manage_options",
          icon: "file"
        });
      } catch (error) {
        console.error("  \u2717 Failed to register admin views:", error.message);
      }
      try {
        console.log("  \u2713 Registering RAG plugin client components");
        registerClientComponent("KnowledgeBaseSidebar", "pages/client/KnowledgeBaseSidebar.js", {
          description: "Document management sidebar for chat interface",
          usage: "sidebar-left",
          // WordPress-style: register for left sidebar position
          features: ["document-list", "workspace-creation", "document-upload", "rag-settings"]
        });
      } catch (error) {
        console.error("  \u2717 Failed to register client components:", error.message);
      }
      hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
        context.addMenuItem({
          id: "rag",
          label: "RAG",
          url: "/bb-admin/plugin/rag-documents",
          // WordPress-style: /bb-admin/plugin/[slug]
          icon: "Database",
          position: 30
        });
        context.addSubmenuItem("rag", {
          label: "Documents",
          url: "/bb-admin/plugin/rag-documents"
        });
        context.addSubmenuItem("rag", {
          label: "Settings",
          url: "/bb-admin/plugin/rag-settings"
        });
      }, 10);
      try {
        const routesPath = path.join(__dirname, "config", "routes.js");
        console.log("  \u2713 Loading RAG routes from plugin:", routesPath);
        __require(routesPath);
        console.log("  \u2713 RAG routes registered successfully");
      } catch (error) {
        console.error("  \u2717 Failed to load RAG routes:", error.message);
      }
    }
    async function activate(pluginAPI) {
      const path = __require("path");
      const { exec } = __require("child_process");
      const { promisify } = __require("util");
      const execAsync = promisify(exec);
      const fs = __require("fs").promises;
      console.log("\n\u{1F50C} Activating RAG Plugin...");
      try {
        console.log("  \u{1F4E6} Installing plugin dependencies...");
        const pluginDir = path.join(__dirname);
        const packageJsonPath = path.join(pluginDir, "package.json");
        try {
          await fs.access(packageJsonPath);
          console.log(`  \u2713 Found package.json at ${packageJsonPath}`);
          const { stdout, stderr } = await execAsync("npm install", {
            cwd: pluginDir,
            env: { ...process.env, NODE_ENV: "production" }
          });
          if (stdout)
            console.log(`  \u2713 npm install output:
${stdout.split("\n").map((l) => "    " + l).join("\n")}`);
          if (stderr && !stderr.includes("npm WARN")) {
            console.warn(`  \u26A0 npm install warnings:
${stderr.split("\n").map((l) => "    " + l).join("\n")}`);
          }
          console.log("  \u2713 Plugin dependencies installed successfully");
        } catch (err) {
          if (err.code === "ENOENT") {
            console.log("  \u2139 No package.json found, skipping dependency installation");
          } else {
            throw err;
          }
        }
        console.log("  \u{1F5C4}\uFE0F  Running database migrations...");
        try {
          const master2 = __require("mastercontroller");
          const migrationsPath = path.join(pluginDir, "app/models/db/migrations");
          try {
            await fs.access(migrationsPath);
            const { stdout: migrationOutput } = await execAsync(
              `cd ${master2.root} && masterrecord update-database rag`,
              { env: process.env }
            );
            console.log("  \u2713 Database migrations completed");
            if (migrationOutput) {
              console.log(`${migrationOutput.split("\n").map((l) => "    " + l).join("\n")}`);
            }
          } catch (err) {
            if (err.code === "ENOENT") {
              console.log("  \u2139 No migrations found, skipping");
            } else {
              throw err;
            }
          }
        } catch (err) {
          console.error("  \u2717 Migration error:", err.message);
          throw err;
        }
        console.log("  \u{1F4C1} Creating plugin directories...");
        const master = __require("mastercontroller");
        const directories = [
          path.join(master.root, "storage/rag/documents"),
          path.join(master.root, "storage/rag/vectors")
        ];
        for (const dir of directories) {
          try {
            await fs.mkdir(dir, { recursive: true });
            console.log(`  \u2713 Created directory: ${dir}`);
          } catch (err) {
            if (err.code !== "EEXIST")
              throw err;
          }
        }
        if (pluginAPI.hookService && pluginAPI.HOOKS) {
          await pluginAPI.hookService.doAction(pluginAPI.HOOKS.PLUGIN_ACTIVATED, {
            pluginName: "rag-plugin",
            pluginPath: pluginDir
          });
        }
        console.log("\u2713 RAG Plugin activated successfully!\n");
        return {
          success: true,
          message: "RAG Plugin activated successfully"
        };
      } catch (error) {
        console.error("\u2717 RAG Plugin activation failed:", error.message);
        console.error(error.stack);
        return {
          success: false,
          error: error.message
        };
      }
    }
    async function deactivate(pluginAPI) {
      console.log("\n\u{1F50C} Deactivating RAG Plugin...");
      try {
        if (pluginAPI.hookService && pluginAPI.HOOKS) {
          await pluginAPI.hookService.doAction(pluginAPI.HOOKS.PLUGIN_DEACTIVATED, {
            pluginName: "rag-plugin",
            pluginPath: __dirname
          });
        }
        console.log("\u2713 RAG Plugin deactivated successfully!\n");
        return {
          success: true,
          message: "RAG Plugin deactivated successfully"
        };
      } catch (error) {
        console.error("\u2717 RAG Plugin deactivation failed:", error.message);
        return {
          success: false,
          error: error.message
        };
      }
    }
    module.exports = { load, activate, deactivate };
  }
});
export default require_rag_plugin();
//# sourceMappingURL=plugin.js.map
