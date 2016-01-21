"use strict";

var passport = require( "passport" );
var GitHubStrategy = require( "passport-github" ).Strategy;
var env = require( "./env" );
var cvr = require( "cvr" );
var models = require( "./models" );

module.exports = passport;

// Passport session setup.
passport.serializeUser( function ( user, done )
{
  done( null, user );
} );

passport.deserializeUser (function ( obj, done )
{
  done( null, obj );
} );

passport.use( new GitHubStrategy({
    clientID: env.gitHub.clientId,
    clientSecret: env.gitHub.clientSecret,
    callbackURL: env.gitHub.callbackUrl,
    scope: [ "user:email", "repo" ],
    passReqToCallback: true
  },
  function ( req, accessToken, refreshToken, profile, done ) {
    process.nextTick( function ()
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
            req.session.user = user;

            if( !dbUser )
            {
                dbUser = new models.User( { oauth: {
                    provider: "github",
                    username: username,
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
    } );
  }
));
