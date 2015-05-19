var express = require( "express" );
var router = express.Router();
var cvr = require( "cvr" );
var passport = require( "passport" );
var mongoose = require( "mongoose" );
var uuid = require( "uuid-lib" );

var auth = require( "../lib/auth" );
var models = require( "../lib/models" );

var dbPass = process.env.DB_PASS || require( "../local-settings.json" ).dbPass;
mongoose.connect( "mongodb://cvr:" + dbPass + "@ds031872.mongolab.com:31872/cvr" );

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  // yay!
});

router.get( "/", function( req, res, next )
{
    res.render("index", { layout: "layout.html", title: "Express" });
} );

router.get( "/repos",
    auth.ensureAuthenticated,
    function( req, res, next )
    {
        var username = req.session.user.profile.username;

        var onUser = function ( err, user )
        {
            if( err )
            {
                return res.status( 500 ).end();
            }

            if( !user )
            {
                user = new models.User({ oauth: {
                    provider: "github",
                    username: username
                }});
            }

            var onRepos = function ( err, repos )
            {
                user.repos = repos;
                user.save( function ( err )
                {
                    if( err )
                    {
                        return res.status( 500 ).end();
                    }

                    res.render( "repos", {
                        layout: "layout.html",
                        title: "Repos",
                        repos: user.repos } );
                });
            };

            if( user.repos.length )
            {
                onRepos( null, user.repos );
            }
            else
            {
                cvr.getGitHubRepos( req.session.user.token, function ( err, repos )
                {
                    repos = repos.map( function ( r )
                    {
                        return {
                            owner: r.owner.login,
                            name: r.name,
                            fullName: r.full_name
                        };
                    } );

                    onRepos( null, repos );
                } );
            }
        };

        var user = models.User.findOne({ "oauth.username": username }, onUser );
    } );

router.get( "/repo/:owner/:name",
    auth.ensureAuthenticated,
    function( req, res, next )
    {
        var onRepo = function ( err, repo )
        {
            if( err )
            {
                return res.status( 500 ).end();
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
                    repo: repo } );
            }

            var commit = repo.commits[ repo.commits.length - 1 ];
            var coverage = commit.coverage;

            var onCov = function ( err, cov )
            {
                res.render( "commit", {
                    layout: "layout.html",
                    repo: repo,
                    cov: cov,
                    hash: commit.hash } );
            };

            cvr.getCoverage( coverage, "lcov", onCov );
        };

        models.Repo.findOne( { owner: req.params.owner, name: req.params.name }, onRepo );

    } );

router.get( "/repo/:owner/:name/:hash/:file(*)",
    auth.ensureAuthenticated,
    function( req, res, next )
    {
        var onRepo = function ( err, repo )
        {
            if( err )
            {
                return res.status( 500 ).end();
            }

            var commit = repo.commits.filter( function ( c )
            {
                return c.hash = req.params.hash;
            });

            if( commit.length === 0 )
            {
                return res.status( 404 ).end();
            }

            var onCov = function ( err, cov )
            {
                var fileCov = cvr.getFileCoverage( cov, req.params.file );

                var onFileContent = function ( err, content )
                {
                    if( err )
                    {
                        console.log( err );
                        return res.status( 500 ).end();
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
                        source: content
                     } );
                };

                cvr.getBlob( req.session.user.token, req.params.owner, req.params.name,
                    req.params.hash, req.params.file, onFileContent );
            };

            cvr.getCoverage( commit[ 0 ].coverage, "lcov", onCov );
        };

        models.Repo.findOne( { owner: req.params.owner, name: req.params.name }, onRepo );
    } );

router.post( "/coverage", function( req, res, next )
{
    if( req.body.token && req.body.commit && req.body.coverage )
    {
        var onCoverageSaved = function ( err )
        {
            if( err )
            {
                return res.status( 404 ).send( err.message ).end();
            }

            return res.status( 201 ).end();
        };

        return saveCoverage( req.body.token, req.body.commit, req.body.coverage, onCoverageSaved );
    }

    res.status( 400 ).end();
} );

var saveCoverage = function ( token, hash, coverage, callback )
{
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

        if( commit.length )
        {
            commit[ 0 ].coverage = coverage;
        }
        else
        {
            repo.commits.push( {
                hash: hash,
                coverage: coverage
            } );
        }

        repo.save( callback );
    };

    models.Repo.findOne( { token: token }, onRepo );
};

module.exports = router;
