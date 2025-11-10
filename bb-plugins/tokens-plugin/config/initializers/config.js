    var master = require('mastercontroller');
    var tokensContext = require(`${master.root}/bb-plugins/tokens-plugin/app/models/tokensContext`);
    master.addSingleton("tokensContext", tokensContext);
