"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var nock = require( "nock" );
var app = require( "../app" );

module.exports = function ()
{
    var agent;
    before( function ( done )
    {
        agent = request.agent( app );
        done();
    } );

    it( "should redirect from the page", function ( done )
    {
        agent
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
        nock( "https://api.github.com" )
            .get( "/user?access_token=123" )
            .reply( 401 );

        agent
            .post( "/auth/github/token" )
            .field( "token", "123" )
            .expect( 401, done );
    } );
};
