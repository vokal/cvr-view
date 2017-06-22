"use strict";

var passport = require( "passport" );
var GitHubStrategy = require( "passport-github" ).Strategy;
var env = require( "./env" );
var cvr = require( "cvr" );
var models = require( "./models" );
var auth = require( "./auth" );

module.exports = passport;

// Passport session setup.
passport.serializeUser( function ( user, done )
{
    done( null, user );
} );

passport.deserializeUser ( function ( obj, done )
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
        auth.login( profile, accessToken, function ( err, user )
        {
            req.session.user = user;
            done( err, user );
        } );
    } );
  }
));
