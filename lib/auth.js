"use strict";

var cvr = require( "cvr" );
var env = require( "./env" );
var models = require( "./models" );

var auth = {};

module.exports = auth;

auth.ensureAuthenticated = function ( req, res, next )
{
    if ( req.isAuthenticated() )
    {
        return next();
    }
    res.cookie( "onauth", req.url );
    res.redirect( "/" );
};

auth.login = function ( profile, accessToken, done )
{
    cvr.getGitHubOrgs( accessToken, function ( err, orgs )
    {
        var orgValid = true;

        if( env.orgsWhitelist && Array.isArray( env.orgsWhitelist ) )
        {
          orgValid = orgs.some( function ( o )
          {
            return env.orgsWhitelist.indexOf( o.login ) !== -1;
          } );
        }

        if( !orgValid )
        {
            return done( new Error( "No permitted organization on account" ) );
        }

        models.User.findOne( { "oauth.username": profile.username }, function ( err, dbUser )
        {
            if( err )
            {
                return done( err );
            }

            var user = { token: accessToken, profile: profile };

            if( !dbUser )
            {
                dbUser = new models.User( { oauth: {
                    provider: "github",
                    username: profile.username,
                    token: accessToken
                } } );
            }
            else if( dbUser.oauth.token !== accessToken )
            {
                dbUser.oauth.token = accessToken;
            }
            else
            {
                return done( null, user );
            }

            return dbUser.save( function ( err )
            {
                done( err, user );
            } );
        } );
    } );
};
