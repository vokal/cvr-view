"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );
var env = require( "../lib/env" );

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
            return res.status( 404 );
        }

        var onCommit = function ( err, commit )
        {
            if( err )
            {
                return next( err );
            }

            if( !commit )
            {
                return res.status( 404 ).end();
            }

            var onCov = function ( err, cov )
            {
                var fileCov = cvr.getFileCoverage( cov, req.params.file );

                if( !fileCov )
                {
                    var file404 = new Error( "File not found in coverage: " + req.params.file );
                    file404.status = 404;
                    return next( file404 );
                }

                var onFileContent = function ( err, content )
                {
                    if( err )
                    {
                        var errMessage = JSON.parse( err.message ).message;
                        if( errMessage === "Not Found" )
                        {
                            var path404 = new Error( "The path " + req.params.file
                                + " does not exist at commit " + req.params.hash
                                + ". Is the path correctly based from the project root?" );
                            path404.status = 404;
                            return next( path404 );
                        }
                        if( errMessage.indexOf( "No commit found for the ref" ) > -1 )
                        {
                            var path404 = new Error( "The hash " + req.params.hash + " does not exist" );
                            path404.status = 404;
                            return next( path404 );
                        }
                        return next( new Error( errMessage ) );
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
                };

                cvr.getGitHubFile( req.session.user.token, req.params.owner, req.params.name,
                    req.params.hash, req.params.file, onFileContent );
            };

            cvr.getCoverage( commit.coverage, commit.coverageType, onCov );
        };

        models.Commit.findCommit( repo.owner, repo.name, req.params.hash, onCommit );
    };

    models.Repo.findByOwnerAndName( req.params.owner, req.params.name, onRepo );
};
