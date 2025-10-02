


// Master version 0.3.4
var master = require('mastercontroller');
var fs = require('fs');
var crypto = require('crypto');
var path = require('path');

// Initialize JWT secrets before starting server
(function initJwtSecrets() {
    const env = process.env.master || 'development';
    const envFile = path.join(__dirname, 'config', 'environments', `env.${env}.json`);
    
    if (fs.existsSync(envFile)) {
        try {
            const content = fs.readFileSync(envFile, 'utf8');
            const config = JSON.parse(content);
            let updated = false;

            // Check and update ACCESS_TOKEN_SECRET
            if (config.jwtAPI?.ACCESS_TOKEN_SECRET === '(ADD_ACCESS_TOKEN_SECRET)') {
                config.jwtAPI.ACCESS_TOKEN_SECRET = crypto.randomBytes(64).toString('hex');
                updated = true;
                console.log(`✅ Generated new ACCESS_TOKEN_SECRET for ${env} environment`);
            }

            // Check and update REFRESH_TOKEN_SECRET
            if (config.jwtAPI?.REFRESH_TOKEN_SECRET === '(ADD_REFRESH_TOKEN_SECRET)') {
                config.jwtAPI.REFRESH_TOKEN_SECRET = crypto.randomBytes(64).toString('hex');
                updated = true;
                console.log(`✅ Generated new REFRESH_TOKEN_SECRET for ${env} environment`);
            }

            // Write back if updated
            if (updated) {
                fs.writeFileSync(envFile, JSON.stringify(config, null, 4), 'utf8');
                console.log(`💾 Updated env.${env}.json with new JWT secrets\n`);
            }
        } catch (error) {
            console.error(`❌ Error initializing JWT secrets:`, error.message);
        }
    }
})();

var server =  master.setupServer("http");

// get environment from variable set when server is being ran. example:  master=development node server.js
master.environmentType = process.env.master;
master.root = __dirname;
master.addInternalTools(["MasterError", "MasterRouter", "MasterHtml", "MasterTemp" , "MasterAction", "MasterActionFilters", "MasterSocket", "MasterSession", "MasterRequest", "MasterCors", "TemplateOverwrite"]);
master.start(server);
require("./config/initializers/config");