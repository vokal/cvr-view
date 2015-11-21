"use strict";

var orgsWhitelist = [];
if( process.env.GITHUB_ORGS_WHITELIST )
{
    orgsWhitelist = process.env.GITHUB_ORGS_WHITELIST.split( ":" );
}
else
{
    orgsWhitelist = require( "../local-settings.json" ).gitHub.orgsWhitelist;
}

module.exports = {
    dbConn: process.env.DB_CONN || require( "../local-settings.json" ).dbConn,
    host: process.env.HOST || require( "../local-settings.json" ).host,
    gitHub: {
        orgsWhitelist: orgsWhitelist,
        clientId: process.env.GITHUB_CLIENTID || require( "../local-settings.json" ).gitHub.clientId,
        clientSecret: process.env.GITHUB_CLIENTSECRET || require( "../local-settings.json" ).gitHub.clientSecret,
        callbackUrl: process.env.GITHUB_CALLBACKURL || require( "../local-settings.json" ).gitHub.callbackUrl
    }
};
