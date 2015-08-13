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

var host = process.env.HOST || require( "../local-settings.json" ).host;

var db = mongoose.connection;
db.on( "error", console.error.bind( console, "connection error:" ));
db.once( "open", function ( callback ) {
  // yay!
});

router.get( "/", function ( req, res, next )
{
    res.render( "index", {
        layout: "layout.html",
        title: "CVR - Code Coverage",
        authed: req.isAuthenticated() });
} );

router.get( "/repos",
    auth.ensureAuthenticated,
    function ( req, res, next )
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

                user.repos = user.repos.sort( function ( a, b )
                {
                    return a.fullName.toLowerCase() > b.fullName.toLowerCase() ? 1
                        : a.fullName.toLowerCase() < b.fullName.toLowerCase() ? -1
                        : 0;
                } );

                var repoFullNames = user.repos.map( function ( r )
                {
                    return r.fullName;
                } );

                models.Repo.findFullNameInArray( repoFullNames, 1, function ( err, activeRepos )
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
                                userRepo.linePercent = lastCoverage.linePercent;
                                userRepo.linePercentFormatted = lastCoverage.linePercent.toFixed( 0 );
                                userRepo.minPassingLinePercent = activeRepo[ 0 ].minPassingLinePercent;
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

            if( user.oauth.token !== req.session.user.token )
            {
                user.oauth.token = req.session.user.token;

                if( user.repos.length && !req.query.refresh )
                {
                    user.save();
                }
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

            repo.token = uuid.raw();
            repo.save( function ()
            {
                return res.redirect( "/repo/" + req.params.owner + "/" + req.params.name );
            }, next );
        };

        models.Repo.findByOwnerAndName( req.params.owner, req.params.name, 0, onRepo );
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
                    authed: true } );
            };

            if( req.body.minPassingLinePercent !== undefined )
            {
                repo.minPassingLinePercent = req.body.minPassingLinePercent;
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

        models.Repo.findByOwnerAndName( req.params.owner, req.params.name, 0, onRepo );
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
                    token: uuid.raw()
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

            var onHashList = function ( err, hashList )
            {
                if( err )
                {
                    return next( err );
                }

                if( !hashList || hashList.commits.length === 0 )
                {
                    return res.render( "commit-activate", {
                        layout: "layout.html",
                        repo: repo,
                        authed: true } );
                }

                var onCommit = function ( err, repoCommits )
                {
                    if( err || !repoCommits.commits.length )
                    {
                        var commit404 = new Error( "Commit not found" );
                        commit404.status = 404;
                        return next( commit404 );
                    }

                    var commit = repoCommits.commits[ 0 ];

                    var hashes = hashList.commits.map( function ( c )
                    {
                        return { hash: c.hash, isPullRequest: c.isPullRequest };
                    } );
                    hashes.reverse();

                    var onCov = function ( err, cov )
                    {
                        if( err )
                        {
                            return next( err );
                        }

                        cov.forEach( function ( file )
                        {
                            file.linePercent = 100 * file.lines.hit / file.lines.found;
                        } );

                        res.render( "commit", {
                            layout: "layout.html",
                            repo: repo,
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
                    models.Repo.findCommit( repo.owner, repo.name, req.params.hash, onCommit );
                }
                else
                {
                    onCommit( null, repo );
                }
            };

            models.Repo.findCommitList( repo.owner, repo.name, onHashList );
        };

        models.Repo.findByOwnerAndName( req.params.owner, req.params.name, req.params.hash ? 0 : 1, onRepo );
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

            var onCommit = function ( err, repoCommit )
            {
                if( err )
                {
                    return next( err );
                }

                if( repoCommit.commits.length === 0 )
                {
                    return res.status( 404 ).end();
                }

                var commit = repoCommit.commits[ 0 ];

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

                cvr.getCoverage( commit.coverage, commit.coverageType, onCov );
            };

            models.Repo.findCommit( repo.owner, repo.name, req.params.hash, onCommit );
        };

        models.Repo.findByOwnerAndName( req.params.owner, req.params.name, 0, onRepo );
    } );

router.post( "/coverage", function ( req, res, next )
{
    var onCoverageSaved = function ( err )
    {
        if( err )
        {
            return res.status( 400 ).send( err.message ).end();
        }

        return res.status( 201 ).end();
    };

    var captureOn = req.body.commit ? req.body : req.query;

    var options = {
        token: captureOn.token,
        owner: captureOn.owner,
        repo: captureOn.repo,
        isPullRequest: captureOn.ispullrequest,
        removePath: captureOn.removepath,
        prependPath: captureOn.prependpath
    };

    var coverage = req.files && req.files.coverage
        ? req.files.coverage.buffer.toString()
        : captureOn.coverage;

    if( captureOn.commit && coverage && ( options.token || options.owner && options.repo ) )
    {
        return saveCoverage( captureOn.commit, coverage,
            captureOn.coveragetype || "lcov", options, onCoverageSaved );
    }

    res.status( 400 ).send( "Required parameters missing" ).end();
} );

var saveCoverage = function ( hash, coverage, coverageType, options, callback )
{
    if( [ "lcov", "cobertura", "jacoco" ].indexOf( coverageType ) === -1 )
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

        var onCommit = function ( err, repoCommit )
        {
            if( err )
            {
                return callback( err );
            }

            var commits = repoCommit.commits;

            cvr.getCoverage( coverage, coverageType, function ( err, cov )
            {
                if( err )
                {
                    return callback( err );
                }

                var onGotAccessToken = function ( err, tokenRes )
                {
                    // not sure how errors should be handled here yet, silent failure seems like an ok option
                    if( err )
                    {
                        console.log( err.message );
                    }
                    if( tokenRes.oauth.token )
                    {
                        var passing = linePercent >= repo.minPassingLinePercent;
                        var newStatus = passing ? "success" : "failure";
                        var newDescription = linePercent.toFixed( 2 ) + "% line coverage";
                        if( !passing )
                        {
                            newDescription += " - requires " + repo.minPassingLinePercent + "%";
                        }

                        var status = {
                            user: repo.owner,
                            repo: repo.name,
                            sha: hash,
                            state: newStatus,
                            context: "cvr",
                            description: newDescription,
                            target_url: host + "repo/" + repo.owner + "/" + repo.name + "/" + hash
                        };

                        cvr.createGitHubStatus( tokenRes.oauth.token, status, function ( err )
                            {
                                // another silent failure?
                                if( err )
                                {
                                    console.log( err.message );
                                }
                            } );
                    }
                };

                var linePercent = cvr.getLineCoveragePercent( cov );

                if( commits.length )
                {
                    commits[ 0 ].coverage = coverage;
                    commits[ 0 ].linePercent = linePercent;
                    repo.save( callback );
                }
                else
                {
                    var newCommit = {
                        hash: hash,
                        coverage: coverage,
                        linePercent: linePercent,
                        coverageType: coverageType,
                        isPullRequest: !!options.isPullRequest
                    };

                    models.Repo.pushCommit( repo._id, newCommit, function ( err )
                    {
                        if( err )
                        {
                            return callback( err );
                        }
                        repo.save( callback );
                    } );
                }

                models.User.getTokenForRepoFullName( repo.fullName, onGotAccessToken );
            } );
        };

        models.Repo.findCommit( repo.owner, repo.name, hash, onCommit );
    };

    if( options.token )
    {
        models.Repo.findByToken( options.token, 0, onRepo );
    }
    else
    {
        models.Repo.findByOwnerAndName( options.owner, options.repo, 0, onRepo );
    }
};

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

    if( !pr )
    {
        return res.status( 400 ).send( "Not a Pull Request" ).end();
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
