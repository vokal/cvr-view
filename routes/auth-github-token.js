"use strict";

var request = require( "request" );
var auth = require( "../lib/auth" );

module.exports = function ( req, res, next )
{
    var token = req.body.token;
    var userApi = "https://api.github.com/user?access_token=" + token;
    var userApiOptions = {
        headers: {
            "User-Agent": "request"
        }
    };

    request( userApi, userApiOptions, function ( err, gitHubRes, body )
    {
        if( gitHubRes.statusCode === 401 )
        {
            var err = new Error( "Invalid Token" );
            err.status = 401;
            return next( err );
        }

        if ( !err && gitHubRes.statusCode === 200 )
        {
            var scopes = gitHubRes.headers[ "x-oauth-scopes" ].split( ", " );

            var scopesAccepted =
                scopes.indexOf( "repo" ) !== -1
                && ( scopes.indexOf( "user:email" ) !== -1 || scopes.indexOf( "user" ) !== -1 );

            if( !scopesAccepted )
            {
                var err = new Error( "Invalid Token Scopes: requires repo, user:email" );
                err.status = 401;
                return next( err );
            }

            var profile = { username: JSON.parse( gitHubRes.body ).login };

            auth.login( profile, token, function ( err, user )
            {
                if( err )
                {
                    return next( err );
                }

                req.login( user, function ( err )
                {
                    if ( err )
                    {
                        return next( err );
                    }
                    req.session.user = user;
                    res.redirect( "/auth/github/success" );
                } );
            } );
        }
    } );
};
