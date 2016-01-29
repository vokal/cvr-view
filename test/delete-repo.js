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
            .expect( 302, done );
    } );

    it( "should delete the cvr-view-seed repo", function ( done )
    {
        agent
            .post( "/repo/vokal/cvr-view-seed/delete" )
            .expect( 302 )
            .end( function ( err, res )
            {
                assert.equal( res.headers.location, "/repos" );
                done( err );
            } );
    } );
};
