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

    it( "should redirect from the page", function ( done )
    {
        request( server )
            .get( "/auth/github/success" )
            .expect( 302 )
            .end( function ( err, res )
            {
                assert.equal( res.headers.location, "/repos" );
                done( err );
            } );
    } );

    it( "should fail token auth when invalid", function ( done )
    {
        request( server )
            .post( "/auth/github/token" )
            .field( "token", "123" )
            .expect( 401, done );
    } );
};
