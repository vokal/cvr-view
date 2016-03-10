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

    it( "should redirect from repos page", function ( done )
    {
        agent
            .get( "/repos" )
            .expect( 302, done );
    } );

    it( "should get a 401 with a bad token", function ( done )
    {
        agent
            .post( "/auth/github/token" )
            .field( "token", "notvalid" )
            .expect( 401, done );
    } );

    it( "should redirect to repos on succesful login", function ( done )
    {
        nock( "https://api.github.com" )
            .get( "/user?access_token=test" )
            .reply( 200, { login: "cvr-view-test" }, { "x-oauth-scopes": "repo, user" } );

        agent
            .post( "/auth/github/token" )
            .field( "token", "test" )
            .expect( 302 )
            .end( function ( err, res )
            {
                assert.equal( res.headers.location, "/auth/github/success" );
                done( err );
            } );
    } );

    it( "should load repos page", function ( done )
    {
        nock( "https://api.github.com" )
            .get( "/user/orgs" )
            .query( { per_page: "100", access_token: "test" } )
            .reply( 200, [ {
                "login": "vokal"
            } ] );

        nock( "https://api.github.com" )
            .get( "/orgs/vokal/repos" )
            .query( { access_token: "test", per_page: 100, page: 1 } )
            .reply( 200, [ {
                "owner": {
                    "login": "vokal"
                },
                "name": "cvr-view-test",
                "full_name": "vokal/cvr-view-test"
            } ] );

        nock( "https://api.github.com" )
            .get( "/user/repos" )
            .query( { access_token: "test", per_page: 100, page: 1 } )
            .reply( 200, [ {
                "owner": { "login": "test" },
                "name": "cvr-view-test",
                "full_name": "vokal/cvr-view-test",
                "permissions": { "push": true }
            } ] );

        nock( "https://api.github.com" )
            .get( "/repos/vokal/cvr-view-test/hooks" )
            .query( { access_token: "test", per_page: 100, page: 1 } )
            .reply( 200, [] )
            .post( "/repos/vokal/cvr-view-test/hooks?access_token=test" )
            .reply( 201 );

        agent
            .get( "/repos" )
            .expect( 200, done );
    } );

    it( "should activate the cvr-view-test repo", function ( done )
    {
        this.timeout( 10000 );

        agent
            .get( "/repo/vokal/cvr-view-test" )
            .expect( 200 )
            .end( function ( err, res )
            {
                assert.equal( /No coverage has been posted for this repo yet/.test( res.text ), true );
                done( err );
            } );
    } );
};
