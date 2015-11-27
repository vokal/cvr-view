"use strict";

var express = require( "express" );
var router = express.Router();
var mongoose = require( "mongoose" );
var auth = require( "../lib/auth" );
var env = require( "../lib/env" );
var passport = require( "../lib/passport" );

mongoose.connect( env.dbConn );

var db = mongoose.connection;
db.on( "error", console.error.bind( console, "connection error:" ) );
db.once( "open", console.log.bind( console, "connection open:" ) );

router.get( "/", function ( req, res, next )
{
    res.render( "index", {
        layout: "layout.html",
        title: "CVR - Code Coverage",
        authed: req.isAuthenticated() });
} );

router.get( "/repos",
    auth.ensureAuthenticated,
    require( "./repos" ) );

router.get( "/repo/:owner/:name/new-token",
    auth.ensureAuthenticated,
    require( "./new-token" ) );

router.post( "/repo/:owner/:name/delete",
    auth.ensureAuthenticated,
    require( "./delete-repo" ) );

router.all( "/repo/:owner/:name/settings",
    auth.ensureAuthenticated,
    require( "./repo-settings" ) );

router.get( "/repo/:owner/:name/:hash?",
    auth.ensureAuthenticated,
    require( "./commit" ) );

router.get( "/repo/:owner/:name/:hash/:file(*)",
    auth.ensureAuthenticated,
    require( "./file" ) );

router.get( "/logout", require( "./logout" ) );
router.get( "/upload", require( "./upload" ) );
router.get( "/:owner/:name/shield.svg", require( "./shield" ) );

router.post( "/coverage", require( "./coverage" ) );
router.post( "/webhook", require( "./webhook" ) );

router.get( "/auth/github", passport.authenticate( "github" ) );

router.get( "/auth/github/callback",
  passport.authenticate( "github", { successRedirect: "/auth/github/success", failureRedirect: "/" } ) );

router.get( "/auth/github/success", function ( req, res )
{
    var onauth = req.cookies.onauth;
    if( onauth )
    {
        res.clearCookie( "onauth" );
        res.redirect( onauth );
    }
    else
    {
        res.redirect( "/repos" );
    }
} );

module.exports = router;
