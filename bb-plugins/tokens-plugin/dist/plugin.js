var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// app/models/tokenUsage.js
var require_tokenUsage = __commonJS({
  "app/models/tokenUsage.js"(exports2, module2) {
    var TokenUsage = class {
      id(db) {
        db.integer().primary().auto();
      }
      chat_id(db) {
        db.integer().nullable();
      }
      message_id(db) {
        db.integer().nullable();
      }
      user_id(db) {
        db.integer().nullable();
      }
      model_id(db) {
        db.integer().nullable();
      }
      model_name(db) {
        db.string().nullable();
      }
      provider(db) {
        db.string().nullable();
      }
      // Token counts
      prompt_tokens(db) {
        db.integer().default(0);
      }
      completion_tokens(db) {
        db.integer().default(0);
      }
      total_tokens(db) {
        db.integer().default(0);
      }
      // Timing metrics
      request_start_time(db) {
        db.integer().nullable();
      }
      request_end_time(db) {
        db.integer().nullable();
      }
      duration_ms(db) {
        db.integer().nullable();
      }
      tokens_per_second(db) {
        db.integer().nullable();
      }
      // Cost tracking (optional, can be calculated based on model pricing)
      estimated_cost(db) {
        db.integer().nullable();
      }
      // Request metadata
      workspace_id(db) {
        db.integer().nullable();
      }
      session_id(db) {
        db.string().nullable();
      }
      request_metadata(db) {
        db.string().nullable();
      }
      // Timestamps
      created_at(db) {
        db.string().notNullable();
        db.get(function(value) {
          if (!value) {
            return Date.now().toString();
          } else {
            return value;
          }
        });
      }
    };
    module2.exports = TokenUsage;
  }
});

// app/models/tokenSettings.js
var require_tokenSettings = __commonJS({
  "app/models/tokenSettings.js"(exports2, module2) {
    var TokenSettings = class {
      id(db) {
        db.integer().primary().auto();
      }
      // Global token limits
      global_token_limit(db) {
        db.integer().nullable();
      }
      global_limit_period(db) {
        db.string().default("monthly");
      }
      global_limit_enabled(db) {
        db.integer().default(0);
      }
      // Per-user token limits
      per_user_token_limit(db) {
        db.integer().nullable();
      }
      per_user_limit_period(db) {
        db.string().default("monthly");
      }
      per_user_limit_enabled(db) {
        db.integer().default(0);
      }
      // Per-chat limits
      per_chat_token_limit(db) {
        db.integer().nullable();
      }
      per_chat_limit_enabled(db) {
        db.integer().default(0);
      }
      // Rate limiting
      rate_limit_enabled(db) {
        db.integer().default(0);
      }
      rate_limit_requests(db) {
        db.integer().default(100);
      }
      rate_limit_window(db) {
        db.integer().default(60);
      }
      // Notification settings
      notify_on_limit_reached(db) {
        db.integer().default(1);
      }
      notify_threshold(db) {
        db.integer().default(90);
      }
      // Cost tracking
      track_costs(db) {
        db.integer().default(0);
      }
      currency(db) {
        db.string().default("USD");
      }
      // Timestamps
      created_at(db) {
        db.string().notNullable();
        db.get(function(value) {
          if (!value) {
            return Date.now().toString();
          } else {
            return value;
          }
        });
      }
      updated_at(db) {
        db.string().notNullable();
        db.get(function(value) {
          if (!value) {
            return Date.now().toString();
          } else {
            return value;
          }
        });
      }
    };
    module2.exports = TokenSettings;
  }
});

// app/models/tokensContext.js
var require_tokensContext = __commonJS({
  "app/models/tokensContext.js"(exports2, module2) {
    var masterrecord = require("masterrecord");
    var path = require("path");
    var TokenUsage = require_tokenUsage();
    var TokenSettings = require_tokenSettings();
    var tokensContext = class extends masterrecord.context {
      constructor() {
        super();
        const pluginEnvPath = path.join(__dirname, "../../config/environments");
        this.env(pluginEnvPath);
        this.dbset(TokenUsage);
        this.dbset(TokenSettings);
      }
    };
    module2.exports = tokensContext;
  }
});

// app/hooks/llmBeforeGenerateHandler.js
var require_llmBeforeGenerateHandler = __commonJS({
  "app/hooks/llmBeforeGenerateHandler.js"(exports2, module2) {
    var TokensContext = require_tokensContext();
    async function handleLLMBeforeGenerate(context) {
      const requestStartTime = Date.now();
      try {
        console.log("\u{1F4CA} Tokens Plugin: LLM_BEFORE_GENERATE hook triggered");
        const {
          messageHistory,
          chatId,
          workspaceId,
          modelConfig,
          modelSettings,
          userMessageId,
          currentUser
        } = context;
        const tokensContext = new TokensContext();
        const settings = await tokensContext.TokenSettings.where().single();
        if (!settings) {
          console.log("\u26A0\uFE0F  Tokens: No settings found, allowing request");
          return {
            ...context,
            _tokenRequestStartTime: requestStartTime
          };
        }
        if (settings.global_limit_enabled) {
          console.log("\u{1F50D} Tokens: Checking global token limit");
          const periodStart = getPeriodStartTime(settings.global_limit_period);
          const totalUsage = await tokensContext.TokenUsage.where({ created_at: { $gte: periodStart } }).sum("total_tokens");
          if (totalUsage >= settings.global_token_limit) {
            console.error(`\u274C Tokens: Global token limit exceeded (${totalUsage}/${settings.global_token_limit})`);
            const error = new Error("Global token limit exceeded. Please contact your administrator.");
            error.code = "TOKEN_LIMIT_EXCEEDED";
            error.type = "global";
            error.currentUsage = totalUsage;
            error.limit = settings.global_token_limit;
            throw error;
          }
          console.log(`\u2705 Tokens: Global limit check passed (${totalUsage}/${settings.global_token_limit})`);
        }
        if (settings.per_user_limit_enabled && currentUser) {
          console.log(`\u{1F50D} Tokens: Checking per-user token limit for user ${currentUser.id}`);
          const periodStart = getPeriodStartTime(settings.per_user_limit_period);
          const userUsage = await tokensContext.TokenUsage.where({
            user_id: currentUser.id,
            created_at: { $gte: periodStart }
          }).sum("total_tokens");
          if (userUsage >= settings.per_user_token_limit) {
            console.error(`\u274C Tokens: Per-user token limit exceeded for user ${currentUser.id} (${userUsage}/${settings.per_user_token_limit})`);
            const error = new Error("Your token limit has been exceeded. Please try again later or contact support.");
            error.code = "TOKEN_LIMIT_EXCEEDED";
            error.type = "per_user";
            error.currentUsage = userUsage;
            error.limit = settings.per_user_token_limit;
            throw error;
          }
          console.log(`\u2705 Tokens: Per-user limit check passed (${userUsage}/${settings.per_user_token_limit})`);
        }
        if (settings.per_chat_limit_enabled && chatId) {
          console.log(`\u{1F50D} Tokens: Checking per-chat token limit for chat ${chatId}`);
          const chatUsage = await tokensContext.TokenUsage.where({ chat_id: chatId }).sum("total_tokens");
          if (chatUsage >= settings.per_chat_token_limit) {
            console.error(`\u274C Tokens: Per-chat token limit exceeded for chat ${chatId} (${chatUsage}/${settings.per_chat_token_limit})`);
            const error = new Error("This chat has exceeded its token limit. Please start a new chat.");
            error.code = "TOKEN_LIMIT_EXCEEDED";
            error.type = "per_chat";
            error.currentUsage = chatUsage;
            error.limit = settings.per_chat_token_limit;
            throw error;
          }
          console.log(`\u2705 Tokens: Per-chat limit check passed (${chatUsage}/${settings.per_chat_token_limit})`);
        }
        console.log("\u2705 Tokens: All limit checks passed, proceeding with LLM request");
        return {
          ...context,
          _tokenRequestStartTime: requestStartTime
        };
      } catch (error) {
        if (error.code === "TOKEN_LIMIT_EXCEEDED") {
          throw error;
        }
        console.error("\u274C Tokens Plugin: Error in LLM_BEFORE_GENERATE handler:", error.message);
        console.error(error.stack);
        return {
          ...context,
          _tokenRequestStartTime: requestStartTime
        };
      }
    }
    function getPeriodStartTime(period) {
      const now = /* @__PURE__ */ new Date();
      let periodStart;
      switch (period) {
        case "daily":
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "weekly":
          const dayOfWeek = now.getDay();
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
          break;
        case "monthly":
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "yearly":
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      return periodStart.getTime();
    }
    module2.exports = handleLLMBeforeGenerate;
  }
});

// app/hooks/llmAfterGenerateHandler.js
var require_llmAfterGenerateHandler = __commonJS({
  "app/hooks/llmAfterGenerateHandler.js"(exports2, module2) {
    var TokensContext = require_tokensContext();
    var TokenUsage = require_tokenUsage();
    async function handleLLMAfterGenerate(context) {
      try {
        console.log("\u{1F4CA} Tokens Plugin: LLM_AFTER_GENERATE hook triggered");
        const {
          response,
          prompt,
          model,
          metadata,
          chatId,
          workspaceId,
          userMessageId,
          messageId,
          currentUser,
          modelConfig,
          _tokenRequestStartTime
        } = context;
        if (!response || !response.usage) {
          console.log("\u26A0\uFE0F  Tokens: No usage data in response, skipping tracking");
          return context;
        }
        const requestEndTime = Date.now();
        const durationMs = _tokenRequestStartTime ? requestEndTime - _tokenRequestStartTime : null;
        const { prompt_tokens, completion_tokens, total_tokens } = response.usage;
        const tokensPerSecond = durationMs ? (total_tokens / (durationMs / 1e3)).toFixed(2) : null;
        console.log(`\u{1F4CA} Tokens: Usage - Prompt: ${prompt_tokens}, Completion: ${completion_tokens}, Total: ${total_tokens}`);
        if (durationMs) {
          console.log(`\u23F1\uFE0F  Tokens: Duration: ${durationMs}ms, Speed: ${tokensPerSecond} tokens/sec`);
        }
        const tokensContext = new TokensContext();
        const tokenUsageRecord = new TokenUsage();
        tokenUsageRecord.chat_id = chatId || null;
        tokenUsageRecord.message_id = messageId || null;
        tokenUsageRecord.user_id = currentUser ? currentUser.id : null;
        tokenUsageRecord.workspace_id = workspaceId || null;
        tokenUsageRecord.model_id = model?.id || null;
        tokenUsageRecord.model_name = model?.name || modelConfig?.model || "unknown";
        tokenUsageRecord.provider = model?.provider || modelConfig?.provider || "unknown";
        tokenUsageRecord.prompt_tokens = prompt_tokens || 0;
        tokenUsageRecord.completion_tokens = completion_tokens || 0;
        tokenUsageRecord.total_tokens = total_tokens || 0;
        tokenUsageRecord.request_start_time = _tokenRequestStartTime || null;
        tokenUsageRecord.request_end_time = requestEndTime;
        tokenUsageRecord.duration_ms = durationMs;
        tokenUsageRecord.tokens_per_second = tokensPerSecond ? parseFloat(tokensPerSecond) : null;
        if (metadata) {
          tokenUsageRecord.request_metadata = JSON.stringify({
            ...metadata,
            has_workspace: !!workspaceId,
            user_message_id: userMessageId
          });
        }
        const settings = await tokensContext.TokenSettings.where().single();
        if (settings && settings.track_costs) {
          tokenUsageRecord.estimated_cost = calculateEstimatedCost(
            tokenUsageRecord.model_name,
            prompt_tokens,
            completion_tokens,
            settings.currency
          );
        }
        await tokensContext.TokenUsage.add(tokenUsageRecord);
        console.log(`\u2705 Tokens: Usage record saved successfully (ID: ${tokenUsageRecord.id})`);
        if (settings) {
          await checkAndNotifyLimits(tokensContext, settings, currentUser, chatId);
        }
        return context;
      } catch (error) {
        console.error("\u274C Tokens Plugin: Error in LLM_AFTER_GENERATE handler:", error.message);
        console.error(error.stack);
        return context;
      }
    }
    function calculateEstimatedCost(modelName, promptTokens, completionTokens, currency = "USD") {
      const pricingTable = {
        "gpt-4": { prompt: 0.03 / 1e3, completion: 0.06 / 1e3 },
        "gpt-4-turbo": { prompt: 0.01 / 1e3, completion: 0.03 / 1e3 },
        "gpt-3.5-turbo": { prompt: 1e-3 / 1e3, completion: 2e-3 / 1e3 },
        "claude-3-opus": { prompt: 0.015 / 1e3, completion: 0.075 / 1e3 },
        "claude-3-sonnet": { prompt: 3e-3 / 1e3, completion: 0.015 / 1e3 },
        "claude-3-haiku": { prompt: 25e-5 / 1e3, completion: 125e-5 / 1e3 }
      };
      const modelKey = Object.keys(pricingTable).find((key) => modelName.toLowerCase().includes(key.toLowerCase()));
      if (!modelKey) {
        return null;
      }
      const pricing = pricingTable[modelKey];
      const cost = promptTokens * pricing.prompt + completionTokens * pricing.completion;
      return parseFloat(cost.toFixed(6));
    }
    async function checkAndNotifyLimits(tokensContext, settings, currentUser, chatId) {
      if (!settings.notify_on_limit_reached) {
        return;
      }
      const threshold = settings.notify_threshold / 100;
      if (settings.global_limit_enabled && settings.global_token_limit) {
        const periodStart = getPeriodStartTime(settings.global_limit_period);
        const totalUsage = await tokensContext.TokenUsage.where({ created_at: { $gte: periodStart } }).sum("total_tokens");
        const usagePercent = totalUsage / settings.global_token_limit;
        if (usagePercent >= threshold) {
          console.log(`\u26A0\uFE0F  Tokens: Global usage at ${(usagePercent * 100).toFixed(1)}% of limit`);
        }
      }
      if (settings.per_user_limit_enabled && settings.per_user_token_limit && currentUser) {
        const periodStart = getPeriodStartTime(settings.per_user_limit_period);
        const userUsage = await tokensContext.TokenUsage.where({
          user_id: currentUser.id,
          created_at: { $gte: periodStart }
        }).sum("total_tokens");
        const usagePercent = userUsage / settings.per_user_token_limit;
        if (usagePercent >= threshold) {
          console.log(`\u26A0\uFE0F  Tokens: User ${currentUser.id} usage at ${(usagePercent * 100).toFixed(1)}% of limit`);
        }
      }
    }
    function getPeriodStartTime(period) {
      const now = /* @__PURE__ */ new Date();
      let periodStart;
      switch (period) {
        case "daily":
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "weekly":
          const dayOfWeek = now.getDay();
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
          break;
        case "monthly":
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "yearly":
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      return periodStart.getTime();
    }
    module2.exports = handleLLMAfterGenerate;
  }
});

// app/hooks/chatAfterMessageHandler.js
var require_chatAfterMessageHandler = __commonJS({
  "app/hooks/chatAfterMessageHandler.js"(exports2, module2) {
    async function handleChatAfterMessage(context) {
      try {
        console.log("\u{1F4CA} Tokens Plugin: CHAT_AFTER_MESSAGE hook triggered");
        const {
          message,
          userId,
          chatId,
          messageId
        } = context;
        console.log(`\u{1F4DD} Tokens: Message saved - Chat: ${chatId}, User: ${userId}, Message: ${messageId}`);
      } catch (error) {
        console.error("\u274C Tokens Plugin: Error in CHAT_AFTER_MESSAGE handler:", error.message);
        console.error(error.stack);
      }
    }
    module2.exports = handleChatAfterMessage;
  }
});

// index.js
var llmBeforeGenerateHandler = require_llmBeforeGenerateHandler();
var llmAfterGenerateHandler = require_llmAfterGenerateHandler();
var chatAfterMessageHandler = require_chatAfterMessageHandler();
function load(pluginAPI) {
  try {
    const { hookService, HOOKS, registerView, registerClientComponent } = pluginAPI;
    const master = require("mastercontroller");
    master.component("bb-plugins", "tokens-plugin");
    registerView("tokens-settings", "admin/tokens/settings/page", {
      title: "Token Settings",
      capability: "manage_options",
      icon: "settings"
    });
    registerView("tokens-analytics", "admin/tokens/analytics/page", {
      title: "Token Analytics",
      capability: "manage_options",
      icon: "activity"
    });
    registerClientComponent("TokenSettingsPage", "admin/tokens/settings/page.js", {
      description: "Token Settings admin page",
      usage: "admin-view",
      viewSlug: "tokens-settings"
    });
    registerClientComponent("TokenAnalyticsPage", "admin/tokens/analytics/page.js", {
      description: "Token Analytics admin page",
      usage: "admin-view",
      viewSlug: "tokens-analytics"
    });
    registerHooks(hookService, HOOKS);
    console.log("\u2713 Tokens Plugin loaded successfully");
  } catch (error) {
    console.error("\u274C Error loading Tokens Plugin:", error.message);
    console.error(error.stack);
    throw error;
  }
}
async function activate() {
  try {
    console.log("\u26A1 Activating Tokens Plugin...");
    console.log("\u2713 Tokens Plugin activated successfully");
  } catch (error) {
    console.error("\u274C Error activating Tokens Plugin:", error.message);
    throw error;
  }
}
async function deactivate() {
  try {
    console.log("\u{1F50C} Deactivating Tokens Plugin...");
    console.log("\u2713 Tokens Plugin deactivated successfully");
  } catch (error) {
    console.error("\u274C Error deactivating Tokens Plugin:", error.message);
    throw error;
  }
}
function registerHooks(hookService, HOOKS) {
  try {
    console.log("\u{1FA9D} Registering Tokens Plugin hooks...");
    hookService.addFilter(HOOKS.LLM_BEFORE_GENERATE, llmBeforeGenerateHandler, 10);
    console.log("  \u2713 LLM_BEFORE_GENERATE: Check token limits");
    hookService.addAction(HOOKS.LLM_AFTER_GENERATE, llmAfterGenerateHandler, 10);
    console.log("  \u2713 LLM_AFTER_GENERATE: Capture token usage");
    hookService.addAction(HOOKS.CHAT_AFTER_MESSAGE, chatAfterMessageHandler, 10);
    console.log("  \u2713 CHAT_AFTER_MESSAGE: Log message events");
    hookService.addAction(HOOKS.ADMIN_MENU, async (context) => {
      context.addMenuItem({
        id: "tokens",
        label: "Tokens",
        url: "/bb-admin/plugin/tokens-analytics",
        // WordPress-style: /bb-admin/plugin/[slug]
        icon: "Activity",
        position: 35
      });
      context.addSubmenuItem("tokens", {
        label: "Analytics",
        url: "/bb-admin/plugin/tokens-analytics"
      });
      context.addSubmenuItem("tokens", {
        label: "Settings",
        url: "/bb-admin/plugin/tokens-settings"
      });
    }, 10);
    console.log("  \u2713 ADMIN_MENU: Add admin menu items");
    console.log("\u2713 All Tokens Plugin hooks registered");
  } catch (error) {
    console.error("\u274C Error registering hooks:", error.message);
    throw error;
  }
}
module.exports = { load, activate, deactivate };
//# sourceMappingURL=plugin.js.map
