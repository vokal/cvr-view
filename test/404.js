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

    it( "should have a 404 page", function ( done )
    {
        request( server )
            .get( "/this/is/not/a/page" )
            .expect( 404 )
            .end( done );
    } );
};
