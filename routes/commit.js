"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );
var env = require( "../lib/env" );
var uuid = require( "node-uuid" );

module.exports = function ( req, res, next )
{
    var onRepo = function ( err, repo )
    {
        if( err )
        {
            return next( err );
        }

        if( !repo )
        {
            repo = new models.Repo({
                provider: "github",
                owner: req.params.owner,
                name: req.params.name,
                fullName: req.params.owner + "/" + req.params.name,
                token: uuid.v4().replace( /-/g, "" )
            });
            repo.save();
        }

        cvr.createGitHubHook( req.session.user.token, repo.owner, repo.name, env.host + "webhook", function ( err )
        {
            if( err )
            {
                console.log( "failed to create hook" );
            }
        } );

        var onHashList = function ( err, hashes )
        {
            if( err )
            {
                return next( err );
            }

            if( !hashes || hashes.length === 0 )
            {
                return res.render( "commit-activate", {
                    layout: "layout.html",
                    repo: repo,
                    authed: true } );
            }

            var onCommit = function ( err, commit )
            {
                if( err || !commit )
                {
                    var commit404 = new Error( "Commit not found" );
                    commit404.status = 404;
                    return next( commit404 );
                }

                var onCov = function ( err, cov )
                {
                    if( err )
                    {
                        return next( err );
                    }

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
                };

                cvr.getCoverage( commit.coverage, commit.coverageType, onCov );
            };

            if( req.params.hash )
            {
                models.Commit.findCommit( repo.owner, repo.name, req.params.hash, onCommit );
            }
            else
            {
                models.Commit.findCommit( repo.owner, repo.name, hashes[ 0 ].hash, onCommit );
            }
        };

        models.Commit.findCommitList( repo.owner, repo.name, onHashList );
    };

    models.Repo.findByOwnerAndName( req.params.owner, req.params.name, onRepo );
};
