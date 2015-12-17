"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "./server" );

module.exports = function ()
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

    it( "should load home page", function ( done )
    {
        request( server )
            .get( "/" )
            .expect( 200, done );
    } );
};
