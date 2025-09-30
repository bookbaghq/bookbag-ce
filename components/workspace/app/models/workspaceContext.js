
var masterrecord = require('masterrecord');
const Workspace = require("./workspace");
const WorkspaceUser = require("./workspaceUser");
const WorkspaceModel = require("./workspaceModel");
const WorkspaceChat = require("./workspaceChat");


class workspaceContext extends masterrecord.context{
    constructor() {
        super();
        this.env("config/environments");
        // Local workspace entities
        this.dbset(Workspace);
        this.dbset(WorkspaceUser);
        this.dbset(WorkspaceModel);
        this.dbset(WorkspaceChat);
        // Cross-context entities used via relations
        // These exist in other modules' contexts and are referenced by name
        // masterrecord resolves by table name when migrating.
    }


}

module.exports = workspaceContext;
