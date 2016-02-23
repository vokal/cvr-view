"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "./server" );
var env = require( "../lib/env" );
var a = require( "async" );

var mongoose = require( "mongoose" );

describe( "CVR", function ()
{
    this.timeout( 3000 );

    var server;
    before( function ( done )
    {
        this.timeout( 10000 );
        var conn = mongoose.createConnection( env.dbConn );

        a.series( [
            function ( done ) { conn.on( "open", done ); },
            function ( done ) { conn.db.dropCollection( "repos", function () { done(); } ); },
            function ( done ) { conn.db.dropCollection( "commits", function () { done(); } ); },
            function ( done ) { conn.db.dropCollection( "users", function () { done(); } ); }
        ], function ( err )
        {
            if( err )
            {
                console.log( err );
            }

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
    describe( "New Token", require( "./new-token" ) );
    describe( "Delete Repo", require( "./delete-repo" ) );
    describe( "Log Out", require( "./log-out" ) );
    describe( "Auth Success", require( "./auth-success" ) );
    describe( "404", require( "./404" ) );

    describe( "HBS", require( "./hbs" ) );
} );
