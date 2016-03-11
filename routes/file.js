"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );
var env = require( "../lib/env" );
var a = require( "async" );

var createError = function ( message, status )
{
    var err = new Error( message );
    err.status = status;
    return err;
};

module.exports = function ( req, res, next )
{
    var repo = null;
    var commit = null;
    var cov = null;
    var fileCov = null;

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
                return done( createError( "Repo not found", 404 ) );
            }

            models.Commit.findCommit( repo.owner, repo.name, req.params.hash, done );
        },
        function ( _commit, done )
        {
            commit = _commit;

            if( !commit )
            {
                return done( createError( "Commit not found", 404 ) );
            }

            cvr.getCoverage( commit.coverage, commit.coverageType, done );
        },
        function ( _cov, done )
        {
            cov = _cov;
            fileCov = cvr.getFileCoverage( cov, req.params.file );

            if( !fileCov )
            {
                return done( createError( "File not found in coverage: " + req.params.file, 404 ) );
            }

            cvr.gitHub.getFile( req.session.user.token, req.params.owner, req.params.name,
                req.params.hash, req.params.file, done );
        }
    ], function ( err, content )
    {
        if( err )
        {
            var errMessage = err;
            try
            {
                errMessage = JSON.parse( err.message ).message;
            }
            catch ( err )
            {
                // it isn't JSON
            }

            if( errMessage === "Not Found" )
            {
                return next( createError( "The path " + req.params.file
                    + " does not exist at commit " + req.params.hash
                    + ". Is the path correctly based from the project root?", 404 ) );
            }

            if( errMessage.indexOf && errMessage.indexOf( "No commit found for the ref" ) > -1 )
            {
                return next( createError( "The hash " + req.params.hash + " does not exist", 404 ) );
            }

            return next( err.status ? err : new Error( errMessage ) );
        }

        res.render( "coverage", {
            layout: "layout.html",
            repo: repo,
            cov: cov,
            hash: req.params.hash,
            fileName: req.params.file,
            extension: cvr.getFileType( req.params.file ),
            linesCovered: cvr.linesCovered( fileCov ).join( "," ),
            linesMissing: cvr.linesMissing( fileCov ).join( "," ),
            source: content,
            authed: true
         } );
    } );
};
