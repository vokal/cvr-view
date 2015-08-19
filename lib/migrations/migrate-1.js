"use strict";

var models = require( "../models" );

module.exports = function ()
{
    models.Repo.find( {} ).exec( function ( err, repos )
    {
        repos.forEach( function ( repo )
        {
            repo.commits.forEach( function ( commit )
            {
                var newCommit = new models.Commit({
                    repo: {
                        owner: repo.owner,
                        name: repo.name,
                        fullName: repo.fullName,
                        provider: repo.provider
                    },
                    hash: commit.hash,
                    coverage: commit.coverage,
                    linePercent: commit.linePercent,
                    coverageType: commit.coverageType,
                    isPullRequest: commit.isPullRequest,
                    created: new Date()
                });

                newCommit.save();
            });

            repo.lastLinePercent = repo.commits.length ? repo.commits[ repo.commits.length - 1 ].linePercent : null;
            repo.commits = [];
            repo.save();
        });
    });
};
