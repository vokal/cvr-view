var express = require( "express" );
var router = express.Router();
var cvr = require( "cvr" );
var passport = require( "passport" );
var auth = require( "../lib/auth" )

router.get( "/", function( req, res, next )
{
    res.render("index", { layout: "layout.html", title: "Express" });
} );

router.get( "/repos",
    auth.ensureAuthenticated,
    function( req, res, next )
    {
        var onRepos = function ( err, repos )
        {
            req.session.repos = repos;
            res.render( "repos", {
                layout: "layout.html",
                title: "Repos",
                repos: repos } );
        };

        if( req.session.repos )
        {
            //TODO: cache in DB
            onRepos( null, req.session.repos );
        }
        else
        {
            cvr.getGitHubRepos( req.session.user.token, onRepos );
        }
    } );

module.exports = router;
