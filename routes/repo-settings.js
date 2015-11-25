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

        var render = function ()
        {
            res.render( "repo-settings", {
                layout: "layout.html",
                repo: repo,
                host: env.host,
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
};
