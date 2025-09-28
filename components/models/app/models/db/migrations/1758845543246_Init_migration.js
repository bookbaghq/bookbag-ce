 
         
var masterrecord = require('masterrecord');

class Init extends masterrecord.schema { 
    constructor(context){
        super(context);
    }

    up(table){
        this.init(table);
        
     this.createTable(table.Model);
     this.createTable(table.Settings);
     this.createTable(table.StopStrings);
     this.createTable(table.Profiles);
     this.createTable(table.ProfileFieldRules);
     this.createTable(table.ModelOverrides);
     this.createTable(table.StartThinkingStrings);
     this.createTable(table.PromptTemplates);

      // Insert settings
      this.seed('PromptTemplates', {
        name: 'gpt',
        template: '{{#system}}{"role":"system","content":"{{system}}"},{{/system}}\n{{#history}}\n{"role":"{{role}}","content":"{{content}}"},\n{{/history}}\n{"role":"user","content":"{{user}}"}',
        created_at: Date.now().toString(),
        updated_at: Date.now().toString()
      });

      this.seed('PromptTemplates', {
        name: 'grok',
        template: '{{#system}}System: {{system}}\\n\\n{{/system}}\n{{#history}}\n{{#isUser}}Human: {{content}}\\n{{/isUser}}\n{{#isAssistant}}Assistant: {{content}}\\n{{/isAssistant}}\n{{/history}}\nHuman: {{user}}\\nAssistant: ',
        created_at: Date.now().toString(),
        updated_at: Date.now().toString()
      });

      this.seed('PromptTemplates', {
        name: 'meta',
        template: '<s>{{#system}}<<SYS>>\\n{{system}}\\n<</SYS>>\\n\\n{{/system}}\n{{#history}}\n{{#isUser}}[INST] {{content}} [/INST]{{/isUser}}\n{{#isAssistant}} {{content}} </s><s>{{/isAssistant}}\n{{/history}}\n[INST] {{user}} [/INST]',
        created_at: Date.now().toString(),
        updated_at: Date.now().toString()
      });

      this.seed('Profiles', {
        name: 'OpenAI',
        description: 'Default profile for OpenAI models',
        created_at: Date.now().toString(),
        updated_at: Date.now().toString()
      });
    }

    down(table){
        this.init(table);
        
    this.droptable(table.Model);
    this.droptable(table.Settings);
    this.droptable(table.StopStrings);
    this.droptable(table.Profiles);
    this.droptable(table.ProfileFieldRules);
    this.droptable(table.ModelOverrides);
    this.droptable(table.StartThinkingStrings);
    this.droptable(table.PromptTemplates);
    }
}
module.exports = Init;
        