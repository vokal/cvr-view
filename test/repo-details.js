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

    it( "should redirect on succesful login", function ( done )
    {
        agent
            .post( "/auth/github/token" )
            .field( "token", process.env.GITHUB_TESTING_AUTH_TOKEN )
            .expect( 302 )
            .end( function ( err, res )
            {
                assert.equal( res.headers.location, "/auth/github/success" );
                done( err );
            } );
    } );

    it( "should load cvr-view-seed repo", function ( done )
    {
        this.timeout( 10000 );

        agent
            .get( "/repo/vokal/cvr-view-seed" )
            .expect( 200 )
            .end( function ( err, res )
            {
                app.repoToken = res.text.match( /\/coverage\?token=([0-9a-z]*)&commit=:commit_hash/ )[ 1 ];
                app.repoFile = res.text.match( /\/repo\/vokal\/cvr-view-seed\/[0-9a-z]*\/[^"]*/ )[ 0 ];
                assert.equal( !!app.repoToken, true );
                done( err );
            } );
    } );

    it( "should load cvr-view-seed repo settings", function ( done )
    {
        agent
            .get( "/repo/vokal/cvr-view-seed/settings" )
            .expect( 200, done );
    } );

    it( "should load a cvr-view-seed file", function ( done )
    {
        agent
            .get( app.repoFile )
            .expect( 200, done );
    } );
};
