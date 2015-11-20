"use strict";

var express = require( "express" );
var router = express.Router();
var cvr = require( "cvr" );
var mongoose = require( "mongoose" );
var uuid = require( "node-uuid" );

var auth = require( "../lib/auth" );
var models = require( "../lib/models" );

var dbConn = process.env.DB_CONN || require( "../local-settings.json" ).dbConn;
mongoose.connect( dbConn );

var host = process.env.HOST || require( "../local-settings.json" ).host;

var db = mongoose.connection;
db.on( "error", console.error.bind( console, "connection error:" ));
db.once( "open", function ( callback ) {
  // yay!
});

var lcovFnMatch = "^FN:[0-9]\\{1,\\},([a-zA-Z0-9_]\\{1,\\})$"
var gocoverMatch = "^[a-zA-Z/]\\{1,\\}\\.go:[0-9]\\{1,\\}\\.[0-9]\\{1,\\},[0-9]\\{1,\\}\\.[0-9]\\{1,\\} [0-9]\\{1,\\} [0-9]\\{1,\\}$"

router.get( "/", function ( req, res, next )
{
    res.render( "index", {
        layout: "layout.html",
        title: "CVR - Code Coverage",
        authed: req.isAuthenticated() });
} );

router.get( "/:owner/:name/shield.svg", function ( req, res, next )
{
    res.type( "image/svg+xml" );

    var onRepo = function ( err, repo )
    {
        if( !repo || err )
        {
            return res.status( 404 ).end();
        }

        cvr.getShield( repo.lastLinePercent, repo.minPassingLinePercent, function ( err, svg )
        {
            if( err )
            {
                console.log( err );
                return res.status( 503 ).end();
            }

            return res.send( svg );
        });
    };

    models.Repo.findByOwnerAndName( req.params.owner, req.params.name, onRepo );
});

router.get( "/upload", function ( req, res, next )
{
    res.set( "Content-Type", "text/plain" );
    res.render( "upload", {
        lcovRegex: lcovFnMatch,
        gocovRegex: gocoverMatch,
        proto: req.protocol,
        host: req.hostname
    } );
} );

router.get( "/repos",
    auth.ensureAuthenticated,
    require( "./repos" ) );

router.get( "/coverage",
    require( "./coverage" ) );

router.get( "/repo/:owner/:name/new-token",
    auth.ensureAuthenticated,
    function ( req, res, next )
    {
        var onRepo = function ( err, repo )
        {
            if( err )
            {
                return next( err );
            }

            repo.token = uuid.v4();
            repo.save( function ()
            {
                return res.redirect( "/repo/" + req.params.owner + "/" + req.params.name );
            }, next );
        };

        models.Repo.findByOwnerAndName( req.params.owner, req.params.name, onRepo );
    } );


router.post( "/repo/:owner/:name/delete",
    auth.ensureAuthenticated,
    function ( req, res, next )
    {
        var onRemove = function ( err, repo )
        {
            if( err )
            {
                return next( err );
            }

            return res.redirect( "/repos" );
        };

        models.Repo.removeByOwnerAndName( req.params.owner, req.params.name, onRemove );
    } );


router.all( "/repo/:owner/:name/settings",
    auth.ensureAuthenticated,
    function ( req, res, next )
    {
        var onRepo = function ( err, repo )
        {
            if( err )
            {
                return next( err );
            }

            var render = function ()
            {
                res.render( "repo-settings", {
                    layout: "layout.html",
                    repo: repo,
                    host: host,
                    authed: true } );
            };

            if( req.body.minPassingLinePercent !== undefined )
            {
                repo.minPassingLinePercent = req.body.minPassingLinePercent;
                repo.removePath = req.body.removePath;
                repo.prependPath = req.body.prependPath;

                repo.save( function ( err )
                {
                    if( err )
                    {
                        return next( err );
                    }
                    return render();
                } );
            }

            return render();
        };

        models.Repo.findByOwnerAndName( req.params.owner, req.params.name, onRepo );
    } );


router.get( "/repo/:owner/:name/:hash?",
    auth.ensureAuthenticated,
    function ( req, res, next )
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
                    token: uuid.v4()
                });
                repo.save();
            }

            cvr.createGitHubHook( req.session.user.token, repo.owner, repo.name, host + "webhook", function ( err )
            {
                if( err )
                {
                    console.log( "failed to register hook" );
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
    } );

router.get( "/repo/:owner/:name/:hash/:file(*)",
    auth.ensureAuthenticated,
    function ( req, res, next )
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
    } );

router.post( "/webhook", function ( req, res, next )
{
    var onSetPending = function ( err )
    {
        if( err )
        {
            return res.status( 400 ).send( "Unable to set pending status" ).end();
        }

        return res.status( 201 ).send( "Created status" ).end();
    };

    var pr = req.body.pull_request;

    if( !pr || [ "opened", "synchronize" ].indexOf( req.body.action ) === -1 )
    {
        return res.status( 202 ).send( "Not a Pull Request" ).end();
    }

    var title = req.body.pull_request.title;

    if( title.indexOf( "[ci skip]" ) >= 0 || title.indexOf( "[skip ci]" ) >= 0 )
    {
        return res.status( 202 ).send( "Commit skipped by user, pending status not set" ).end();
    }

    var onGotAccessToken = function ( err, tokenRes )
    {
        if( err || !tokenRes || !tokenRes.oauth.token )
        {
            return res.status( 400 ).send( "No permission to set status on " + pr.base.repo.full_name ).end();
        }

        var status = {
            user: pr.base.user.login,
            repo: pr.base.repo.name,
            sha: pr.head.sha,
            state: "pending",
            context: "cvr",
            description: "code coverage pending"
        };

        cvr.createGitHubStatus( tokenRes.oauth.token, status, onSetPending );
    };

    models.User.getTokenForRepoFullName( pr.base.repo.full_name, onGotAccessToken );
} );

module.exports = router;
