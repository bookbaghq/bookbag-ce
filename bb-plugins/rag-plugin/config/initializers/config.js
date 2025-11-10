    var master = require('mastercontroller');
    var ragContext = require(`${master.root}/bb-plugins/rag-plugin/app/models/ragContext`);
    master.addSingleton("ragContext", ragContext);
