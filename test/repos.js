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

    it( "should load cvr-view repo", function ( done )
    {
        this.timeout( 4000 );

        agent
            .get( "/repo/vokal/cvr-view" )
            .expect( 200, done );
    } );

    it( "should load cvr-view repo settings", function ( done )
    {
        agent
            .get( "/repo/vokal/cvr-view/settings" )
            .expect( 200, done );
    } );

    it( "should load a cvr-view file", function ( done )
    {
        agent
            .get( "/repo/vokal/cvr-view/4b07d8b911cef066a1f06a49a91ffa7c68e66b35/app.js" )
            .expect( 200, done );
    } );
};
