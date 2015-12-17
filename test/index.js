"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "./server" );


describe( "CVR", function ()
{
    var server;
    before( function ( done )
    {
        app( function ( err, res )
        {
             server = res;
             done( err );
        } );
    } );

    after( function ( done )
    {
        server.close( done );
    } );

    describe( "Home", require( "./home" ) );
    describe( "Repos", require( "./repos" ) );
    describe( "Posting coverage", require( "./coverage" )  );
    describe( "Posting webhook", require( "./webhook" )  );
    describe( "Shields", require( "./shields" ) );
    describe( "Upload", require( "./upload" ) );
    describe( "Log Out", require( "./log-out" ) );

    describe( "HBS", require( "./hbs" ) );
} );
