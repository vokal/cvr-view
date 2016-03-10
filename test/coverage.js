"use strict";

var util = require( "util" );
var assert = require( "assert" );
var request = require( "supertest" );
var app = require( "../app" );
var nock = require( "nock" );
var commit = "558bc5aa45d591b3cdfea80af29e7ffb66ff55f1";

module.exports = function ()
{
    var agent;
    before( function ( done )
    {
        agent = request.agent( app );
        done();
    } );

    it( "should validate posting coverage", function ( done )
    {
        agent
            .post( "/coverage" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Commit is required" );
                done( err );
            } );
    } );

    it( "should validate repo is required", function ( done )
    {
        agent
            .post( "/coverage" )
            .field( "commit", "123" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Token or owner and repo are required" );
                done( err );
            } );
    } );

    it( "should validate token", function ( done )
    {
        agent
            .post( "/coverage" )
            .field( "commit", "123" )
            .field( "token", "123" )
            .attach( "coverage", "test/assets/lcov.info" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Token is not registered" );
                done( err );
            } );
    } );

    it( "should validate repo exists under owner", function ( done )
    {
        this.timeout( 5000 );

        agent
            .post( "/coverage" )
            .field( "commit", "123" )
            .field( "owner", "123" )
            .field( "repo", "123" )
            .attach( "coverage", "test/assets/lcov.info" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Cannot find repo by owner and repo name" );
                done( err );
            } );
    } );

    it( "should validate coverage has content", function ( done )
    {
        agent
            .post( "/coverage" )
            .field( "commit", "123" )
            .field( "owner", "123" )
            .field( "repo", "123" )
            .attach( "coverage", "test/assets/empty.info" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Coverage is empty" );
                done( err );
            } );
    } );

    it( "should validate coverage has a valid type", function ( done )
    {
        agent
            .post( "/coverage" )
            .field( "commit", "123" )
            .field( "owner", "123" )
            .field( "repo", "123" )
            .field( "coveragetype", "not a real thing" )
            .attach( "coverage", "test/assets/lcov.info" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Coverage type not valid" );
                done( err );
            } );
    } );

    it( "should validate that commit exists on GitHub", function ( done )
    {
        agent
            .post( "/coverage" )
            .field( "commit", "thisisnotacommit" )
            .field( "owner", "vokal" )
            .field( "repo", "cvr-view-test" )
            .attach( "coverage", "test/assets/lcov.info" )
            .expect( 400 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "The commit thisisnotacommit does not exist" );
                done( err );
            } );
    } );

    it( "should save coverage", function ( done )
    {
        nock( "https://api.github.com" )
            .get( util.format( "/repos/vokal/cvr-view-test/commits?sha=%s&access_token=test", commit ) )
            .reply( 200 )
            .get( "/repos/vokal/cvr-view-test/pulls?access_token=test" )
            .reply( 200, [ { head: { sha: commit } } ] )
            .post( util.format( "/repos/vokal/cvr-view-test/statuses/%s?access_token=test", commit ) )
            .reply( 201 );

        agent
            .post( "/coverage" )
            .field( "commit", commit )
            .field( "owner", "vokal" )
            .field( "repo", "cvr-view-test" )
            .attach( "coverage", "test/assets/lcov.info" )
            .expect( 201 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Saved coverage" );
                done( err );
            } );
    } );

    it( "should abort pending coverage", function ( done )
    {
        nock( "https://api.github.com" )
            .post( util.format( "/repos/vokal/cvr-view-test/statuses/%s?access_token=test", commit ) )
            .reply( 200 );

        agent
            .post( "/coverage/abort" )
            .field( "commit", "558bc5aa45d591b3cdfea80af29e7ffb66ff55f1" )
            .field( "owner", "vokal" )
            .field( "repo", "cvr-view-test" )
            .field( "reason", "This was a test" )
            .expect( 201 )
            .end( function ( err, res )
            {
                assert.equal( res.text, "Status created" );
                done( err );
            } );
    } );
};
