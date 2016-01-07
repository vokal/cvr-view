"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "../app" );

module.exports = function ()
{
    var agent;
    before( function ( done )
    {
        agent = request.agent( app );
        done();
    } );

    it( "should redirect from repos page", function ( done )
    {
        agent
            .get( "/repos" )
            .expect( 302, done );
    } );

    it( "should redirect to repos on succesful login", function ( done )
    {
        agent
            .post( "/auth/github/token" )
            .field( "token", process.env.GITHUB_TESTING_AUTH_TOKEN )
            .expect( 302 )
            .end( function ( err, res )
            {
                assert.equal( res.headers.location, "/repos" );
                done( err );
            } );
    } );

    it( "should load repos page", function ( done )
    {
        agent
            .get( "/repos" )
            .expect( 200, done );
    } );
};
