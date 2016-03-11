"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "../app" );
var nock = require( "nock" );

module.exports = function ()
{
    var agent;
    before( function ( done )
    {
        agent = request.agent( app );
        done();
    } );

    it( "should redirect on succesful login", function ( done )
    {
        nock( "https://api.github.com" )
            .get( "/user?access_token=test" )
            .reply( 200, { login: "cvr-view-test" }, { "x-oauth-scopes": "repo, user" } );

        agent
            .post( "/auth/github/token" )
            .field( "token", "test" )
            .expect( 302, done );
    } );

    it( "should create a new token for the cvr-view-test repo", function ( done )
    {
        agent
            .get( "/repo/vokal/cvr-view-test/new-token" )
            .expect( 302 )
            .end( function ( err, res )
            {
                assert.equal( res.headers.location, "/repo/vokal/cvr-view-test" );
                done( err );
            } );
    } );
};
