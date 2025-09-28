    var master = require('mastercontroller');
    var authService = require(`../../app/service/authService`);
    master.addSingleton("authService", authService);