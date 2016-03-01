"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );
var env = require( "../lib/env" );
var uuid = require( "node-uuid" );
var a = require( "async" );

module.exports = function ( req, res, next )
{
    var repo = null;
    var hashes = null;
    var commit = null;

    a.waterfall( [
        function ( done )
        {
            models.Repo.findByOwnerAndName( req.params.owner, req.params.name, done );
        },
        function ( _repo, done )
        {
            repo = _repo;
            if( !repo )
            {
                repo = new models.Repo( {
                    provider: "github",
                    owner: req.params.owner,
                    name: req.params.name,
                    fullName: req.params.owner + "/" + req.params.name,
                    token: uuid.v4().replace( /-/g, "" )
                } );
                repo.save();
            }

            cvr.gitHub.createHook( req.session.user.token, repo.owner, repo.name, env.host + "webhook", function ( err )
            {
                if( err )
                {
                    console.log( "failed to create hook" );
                }
            } );

            models.Commit.findCommitList( repo.owner, repo.name, done );
        },
        function ( _hashes, done )
        {
            hashes = _hashes;
            if( hashes && hashes.length !== 0 )
            {
                if( req.params.hash )
                {
                    models.Commit.findCommit( repo.owner, repo.name, req.params.hash, done );
                }
                else
                {
                    models.Commit.findCommit( repo.owner, repo.name, hashes[ 0 ].hash, done );
                }
                return;
            }

            res.render( "commit-activate", {
                layout: "layout.html",
                repo: repo,
                authed: true } );

            done( new Error( "new repo" ) );
        },
        function ( _commit, done )
        {
            commit = _commit;
            if( !commit )
            {
                var commit404 = new Error( "Commit not found" );
                commit404.status = 404;
                return done( commit404 );
            }

            cvr.getCoverage( commit.coverage, commit.coverageType, done );
        },
        function ( cov, done )
        {
            cvr.sortCoverage( cov )
                .forEach( function ( file )
                {
                    file.linePercent = cvr.getLineCoveragePercent( [ file ] );
                } );

            res.render( "commit", {
                layout: "layout.html",
                repo: repo,
                commit: repo.commits[ 0 ] || commit,
                cov: cov,
                hash: commit.hash,
                isPullRequest: commit.isPullRequest,
                hashes: hashes,
                authed: true } );

            done();
        }
    ], function ( err, results )
    {
        if( err )
        {
            if( err.message === "new repo" )
            {
                return;
            }

            next( err );
        }
    } );
};
