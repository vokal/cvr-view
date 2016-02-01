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

    it( "should get a 401 with a bad token", function ( done )
    {
        agent
            .post( "/auth/github/token" )
            .field( "token", "notvalid" )
            .expect( 401, done );
    } );

    it( "should redirect to repos on succesful login", function ( done )
    {
        this.timeout( 10000 );

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

    it( "should load repos page", function ( done )
    {
        this.timeout( 30000 ); // this takes too long on the first load

        agent
            .get( "/repos" )
            .expect( 200, done );
    } );

    it( "should activate the cvr-view-seed repo", function ( done )
    {
        this.timeout( 10000 );

        agent
            .get( "/repo/vokal/cvr-view-seed" )
            .expect( 200 )
            .end( function ( err, res )
            {
                assert.equal( /No coverage has been posted for this repo yet/.test( res.text ), true );
                done( err );
            } );
    } );
};
