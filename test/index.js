"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "./server" );
var env = require( "../lib/env" );
var a = require( "async" );

var mongoose = require( "mongoose" );

describe( "CVR", function ()
{
    var server;
    before( function ( done )
    {
        this.timeout( 5000 );
        var conn = mongoose.createConnection( env.dbConn );

        a.series( [
            function ( done ) { conn.on( "open", done ); },
            function ( done ) { conn.db.dropCollection( "repos", function () { done( null ); } ); },
            function ( done ) { conn.db.dropCollection( "commits", function () { done( null ); } ); },
            function ( done ) { conn.db.dropCollection( "users", function () { done( null ); } ); }
        ], function ()
        {
            app( function ( err, res )
            {
                 server = res;
                 done( err );
            } );
        } );
    } );

    after( function ( done )
    {
        server.close( done );
    } );

    describe( "Home", require( "./home" ) );
    describe( "Repos", require( "./repos" ) );
    describe( "Repo Settings", require( "./repo-settings" ) );
    describe( "Posting coverage", require( "./coverage" ) );
    describe( "Posting webhook", require( "./webhook" ) );
    describe( "Repo Details", require( "./repo-details" ) );
    describe( "Shields", require( "./shields" ) );
    describe( "Upload", require( "./upload" ) );
    describe( "Log Out", require( "./log-out" ) );
    describe( "Auth Success", require( "./auth-success" ) );
    describe( "404", require( "./404" ) );

    describe( "HBS", require( "./hbs" ) );
} );
