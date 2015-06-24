"use strict";

var express = require( "express" );
var router = express.Router();
var cvr = require( "cvr" );
var mongoose = require( "mongoose" );
var uuid = require( "uuid-lib" );

var auth = require( "../lib/auth" );
var models = require( "../lib/models" );

var dbConn = process.env.DB_CONN || require( "../local-settings.json" ).dbConn;
mongoose.connect( dbConn );

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  // yay!
});

router.get( "/", function( req, res, next )
{
    res.render("index", {
        layout: "layout.html",
        title: "CVR - Code Coverage",
        authed: req.isAuthenticated() });
} );

router.get( "/repos",
    auth.ensureAuthenticated,
    function( req, res, next )
    {
        var username = req.session.user.profile.username;


        var onActiveRepos = function ( err, user, active )
        {
            if( err )
            {
                return next( err );
            }

            res.render( "repos", {
                layout: "layout.html",
                title: "Repos",
                repos: user.repos,
                activeRepos: user.activeRepos,
                authed: true } );
        };

        var onUserRepos = function ( err, user )
        {
            user.save( function ( err )
            {
                if( err )
                {
                    return next( err );
                }

                if( req.query.refresh )
                {
                    return res.redirect( "/repos" );
                }

                var repoFullNames = user.repos.map( function ( r )
                {
                    return r.fullName;
                } );

                models.Repo.findFullNameInArray( repoFullNames, function ( err, activeRepos )
                {
                    if( err )
                    {
                        return next( err );
                    }

                    user.activeRepos = [];

                    user.repos.forEach( function ( userRepo )
                    {
                        var activeRepo = activeRepos.filter( function ( activeRepo )
                        {
                            return activeRepo.fullName === userRepo.fullName;
                        } );

                        if( activeRepo.length )
                        {
                            if( activeRepo[ 0 ].commits && activeRepo[ 0 ].commits.length )
                            {
                                var lastCoverage = activeRepo[ 0 ].commits[ activeRepo[ 0 ].commits.length - 1 ];
                                userRepo.linePercent = lastCoverage.linePercent.toFixed( 0 );
                            }

                            user.activeRepos.push( userRepo );
                        }
                    } );

                    user.repos = user.repos.filter( function ( userRepo )
                    {
                        return !userRepo.isActive;
                    } );

                    onActiveRepos( null, user );
                } );
            });
        };

        var onUser = function ( err, user )
        {
            if( err )
            {
                return next( err );
            }

            if( !user )
            {
                user = new models.User({ oauth: {
                    provider: "github",
                    username: username
                }});
            }

            if( user.repos.length && !req.query.refresh )
            {
                onUserRepos( null, user );
            }
            else
            {
                cvr.getGitHubRepos( req.session.user.token, function ( err, repos )
                {
                    if( err )
                    {
                        return next( err );
                    }

                    user.repos = repos.map( function ( r )
                    {
                        return {
                            owner: r.owner.login,
                            name: r.name,
                            fullName: r.full_name
                        };
                    } );

                    onUserRepos( null, user );
                } );
            }
        };

        models.User.findOne( { "oauth.username": username }, onUser );
    } );

router.get( "/repo/:owner/:name/:hash?",
    auth.ensureAuthenticated,
    function( req, res, next )
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
                    token: uuid.raw()
                });
                repo.save();
            }

            if( repo.commits.length === 0 )
            {
                return res.render( "commit-activate", {
                    layout: "layout.html",
                    repo: repo,
                    authed: true } );
            }

            var commit = repo.commits[ repo.commits.length - 1 ];

            if( req.params.hash )
            {
                commit = repo.commits.filter( function ( c )
                {
                    return c.hash === req.params.hash;
                } )[ 0 ];

                if( !commit )
                {
                    var commit404 = new Error( "Commit not found" );
                    commit404.status = 404;
                    return next( commit404 );
                }
            }

            var hashes = repo.commits.map( function ( c )
            {
                return c.hash;
            } );
            hashes.reverse();

            var onCov = function ( err, cov )
            {
                res.render( "commit", {
                    layout: "layout.html",
                    repo: repo,
                    cov: cov,
                    hash: commit.hash,
                    hashes: hashes,
                    authed: true } );
            };

            cvr.getCoverage( commit.coverage, commit.coverageType, onCov );
        };

        models.Repo.findByOwnerAndName( req.params.owner, req.params.name, onRepo );
    } );

router.get( "/repo/:owner/:name/:hash/:file(*)",
    auth.ensureAuthenticated,
    function( req, res, next )
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

            var commit = repo.commits.filter( function ( c )
            {
                return c.hash === req.params.hash;
            } );

            if( commit.length === 0 )
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

            cvr.getCoverage( commit[ 0 ].coverage, commit[ 0 ].coverageType, onCov );
        };

        models.Repo.findByOwnerAndName( req.params.owner, req.params.name, onRepo );
    } );

router.post( "/coverage", function( req, res, next )
{
    var onCoverageSaved = function ( err )
    {
        if( err )
        {
            return res.status( 400 ).send( err.message ).end();
        }

        return res.status( 201 ).end();
    };

    if( req.body.token && req.body.commit && req.body.coverage )
    {
        return saveCoverage( req.body.token, req.body.commit,
            req.body.coverage, req.body.coveragetype || "lcov",
            {
                removePath: req.body.removepath,
                prependPath: req.body.prependpath
            } , onCoverageSaved );
    }
    else if( req.query.token && req.query.commit && req.files && req.files.coverage )
    {
        return saveCoverage( req.query.token, req.query.commit,
            req.files.coverage.buffer.toString(), req.query.coveragetype || "lcov",
            {
                removePath: req.query.removepath,
                prependPath: req.query.prependpath
            }, onCoverageSaved );
    }

    res.status( 400 ).send( "Required parameters missing" ).end();
} );

var saveCoverage = function ( token, hash, coverage, coverageType, options, callback )
{
    if( [ "lcov", "cobertura" ].indexOf( coverageType ) === -1 )
    {
        return callback( new Error( "Coverage Type not valid" ) );
    }

    if( !coverage )
    {
        return callback( new Error( "Coverage is empty" ) );
    }

    if( options.removePath )
    {
        coverage = cvr.removePath( coverage, options.removePath );
    }

    if( options.prependPath )
    {
        coverage = cvr.prependPath( coverage, options.prependPath, coverageType );
    }

    var onRepo = function ( err, repo )
    {
        if( err )
        {
            return callback( err );
        }

        if( !repo )
        {
            return callback( new Error( "Token is not registered" ) );
        }

        var commit = repo.commits.filter( function ( c )
        {
            return c.hash == hash;
        } );

        cvr.getCoverage( coverage, coverageType, function ( err, cov )
        {
            if( err )
            {
                return callback( err );
            }

            var linePercent = cvr.getLineCoveragePercent( cov );

            if( commit.length )
            {
                commit[ 0 ].coverage = coverage;
                commit[ 0 ].linePercent = linePercent;
            }
            else
            {
                repo.commits.push( {
                    hash: hash,
                    coverage: coverage,
                    linePercent: linePercent,
                    coverageType: coverageType
                } );
            }

            repo.save( callback );
        } );
    };

    models.Repo.findOne( { token: token }, onRepo );
};

module.exports = router;
