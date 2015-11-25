"use strict";

require( "dotenv" ).load();

module.exports = {
    dbConn: process.env.DB_CONN,
    host: process.env.HOST,
    gitHub: {
        orgsWhitelist: ( process.env.GITHUB_ORGS_WHITELIST || "" ).split( ":" ),
        clientId: process.env.GITHUB_CLIENTID,
        clientSecret: process.env.GITHUB_CLIENTSECRET,
        callbackUrl: process.env.GITHUB_CALLBACKURL
    }
};
