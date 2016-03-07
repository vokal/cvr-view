"use strict";

var cvr = require( "cvr" );
var models = require( "../lib/models" );

module.exports = function ( req, res, next )
{
    var username = req.session.user.profile.username;

    var onActiveRepos = function ( err, user, activeRepos )
    {
        if( err )
        {
            return next( err );
        }

        var linesFound = activeRepos.reduce( ( acc, r ) => acc + r.linesFound, 0 );
        var linesHit = activeRepos.reduce( ( acc, r ) => acc + r.linesHit, 0 );

        res.render( "repos", {
            layout: "layout.html",
            title: "Repos",
            repos: user.repos,
            activeRepos: activeRepos,
            linesFound: linesFound,
            linesHit: linesHit,
            linesPercent: 100 * linesHit / linesFound,
            authed: true
        } );
    };

    var onUserRepos = function ( err, user )
    {
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

        models.Repo.findFullNameInArray( repoFullNames, function ( err, activeRepos )
        {
            if( err )
            {
                return next( err );
            }

            var userActiveRepos = [];

            user.repos.forEach( function ( userRepo )
            {
                var activeRepo = activeRepos.filter( function ( activeRepo )
                {
                    return activeRepo.fullName === userRepo.fullName;
                } )[ 0 ];

                if( activeRepo )
                {
                    userRepo.minPassingLinePercent = activeRepo.minPassingLinePercent;
                    userRepo.linePercent = activeRepo.lastLinePercent;
                    userRepo.linesFound = activeRepo.lastLinesFound;
                    userRepo.linesHit = activeRepo.lastLinesHit;
                    userActiveRepos.push( userRepo );
                }
            } );

            user.repos = user.repos.filter( function ( userRepo )
            {
                return !userRepo.isActive;
            } );

            onActiveRepos( null, user, userActiveRepos );
        } );
    };

    var onUser = function ( err, user )
    {
        if( err )
        {
            return next( err );
        }

        if( !user )
        {
            return res.redirect( "/" );
        }

        if( user.repos.length && !req.query.refresh )
        {
            onUserRepos( null, user );
        }
        else
        {
            cvr.gitHub.getRepos( req.session.user.token, function ( err, repos )
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
                        fullName: r.full_name,
                        permissions: r.permissions
                    };
                } );

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

                    onUserRepos( null, user );
                } );
            } );
        }
    };

    models.User.findOne( { "oauth.username": username }, onUser );
};
