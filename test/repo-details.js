"use strict";

var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "../app" );
var nock = require( "nock" );
var fs = require( "fs" );
var path = require( "path" );
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
            .expect( 302 )
            .end( function ( err, res )
            {
                assert.equal( res.headers.location, "/auth/github/success" );
                done( err );
            } );
    } );

    it( "should load cvr-view-test repo", function ( done )
    {
        nock( "https://api.github.com" )
            .get( "/repos/vokal/cvr-view-test/hooks" )
            .query( { access_token: "test", per_page: 100, page: 1 } )
            .reply( 200, [ {
                config: { url: env.host + "webhook" }
            } ] );

        agent
            .get( "/repo/vokal/cvr-view-test" )
            .expect( 200 )
            .end( function ( err, res )
            {
                app.repoToken = res.text.match( /\/coverage\?token=([0-9a-z]*)&commit=:commit_hash/ )[ 1 ];
                app.repoFile = res.text.match( /\/repo\/vokal\/cvr-view-test\/[0-9a-z]*\/[^"]*/ )[ 0 ];
                assert.equal( !!app.repoToken, true );
                done( err );
            } );
    } );

    it( "should load cvr-view-test repo settings", function ( done )
    {
        agent
            .get( "/repo/vokal/cvr-view-test/settings" )
            .expect( 200, done );
    } );

    it( "should update cvr-view-test repo settings", function ( done )
    {
        agent
            .post( "/repo/vokal/cvr-view-test/settings" )
            .field( "minPassingLinePercent", 50 )
            .field( "removePath", "" )
            .field( "prependPath", "" )
            .expect( 200, done );
    } );

    it( "should load a cvr-view-test file", function ( done )
    {
        nock( "https://api.github.com" )
            .get( "/repos/vokal/cvr-view-test/contents/app.js?ref=558bc5aa45d591b3cdfea80af29e7ffb66ff55f1&access_token=test" )
            .reply( 200, {
                encoding: "base64",
                content: fs.readFileSync( path.resolve( process.cwd(), "app.js" ) ).toString()
            } );

        agent
            .get( app.repoFile )
            .expect( 200, done );
    } );
};
