"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );

module.exports = function ( req, res, next )
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
};
