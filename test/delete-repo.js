"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var nock = require( "nock" );
var app = require( "../app" );
var env = require( "../lib/env" );

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

    it( "should delete the cvr-view-test repo", function ( done )
    {
        nock( "https://api.github.com" )
            .get( "/repos/vokal/cvr-view-test/hooks" )
            .query( { access_token: "test", per_page: 100, page: 1 } )
            .reply( 200, [ {
                config: { url: env.host + "webhook" }
            } ] )
            .delete( "/repos/vokal/cvr-view-test/hooks?access_token=test" )
            .reply( 200 );

        agent
            .post( "/repo/vokal/cvr-view-test/delete" )
            .expect( 302 )
            .end( function ( err, res )
            {
                assert.equal( res.headers.location, "/repos" );
                done( err );
            } );
    } );
};
