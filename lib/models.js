"use strict";

var mongoose = require( "mongoose" );

var models = {};

module.exports = models;

var repoSchema = mongoose.Schema({
    provider: { type: String, index: 1 },
    owner: { type: String, index: 1 },
    name: { type: String, index: 1 },
    fullName: { type: String, index: 1 },
    token: { type: String, index: 1 },
    webhookId: String,
    minPassingLinePercent: { type: Number, default: 80 },
    removePath: String,
    prependPath: String,
    lastLinePercent: { type: Number },
    lastLinesFound: { type: Number, default: 0 },
    lastLinesHit: { type: Number, default: 0 }
});

repoSchema.statics.findByOwnerAndName = function ( owner, name, cb )
{
    return this.findOne( { owner: owner, name: name }, cb );
};

repoSchema.statics.removeByOwnerAndName = function ( owner, name, cb )
{
    return this.find( { owner: owner, name: name } ).deleteOne( cb );
};

repoSchema.statics.findByToken = function ( token, cb )
{
    return this.findOne( { token: token }, cb );
};

repoSchema.statics.findFullNameInArray = function ( repoFullNames, cb )
{
    return this.find( { fullName: { $in: repoFullNames } }, cb );
};



var commitSchema = mongoose.Schema({
    repo: {
        provider: { type: String, index: 1 },
        owner: { type: String, index: 1 },
        name: { type: String, index: 1 },
        fullName: { type: String, index: 1 }
    },
    hash: String,
    coverage: String,
    coverageType: { type: String, default: "lcov" },
    linePercent: Number,
    linesFound: { type: Number, default: 0 },
    linesHit: { type: Number, default: 0 },
    isPullRequest: { type: Boolean, default: false },
    created: { type: Date, default: new Date(), index: 1 }
} );


commitSchema.statics.pushCommit = function ( commit, cb )
{
    var maxCommits = process.env.MAX_REPO_COMMIT_HISTORY || 20;

    return this.find( { "repo.owner": commit.repo.owner, "repo.name": commit.repo.name } )
        .sort( "-created" )
        .skip( maxCommits )
        .exec( function ( err, results )
        {
            results.forEach( function ( c )
            {
                c.deleteOne();
            });

            commit.save( cb );
        });
};

commitSchema.statics.findCommit = function ( owner, name, hash, cb )
{
    return this.findOne( { "repo.owner": owner, "repo.name": name, hash: hash }, cb );
};

commitSchema.statics.findCommitList = function ( owner, name, cb )
{
    return this.find(
            { "repo.owner": owner, "repo.name": name },
            { hash: 1, isPullRequest: 1, created: 1, linePercent: 1, linesFound: 1, linesHit: 1 } )
        .sort( "-created" )
        .exec( cb );
};


var userSchema = mongoose.Schema( {
    oauth: {
        provider: { type: String, index: 1 },
        username: { type: String, index: 1 },
        token: { type: String, index: 1 }
    },
    repos: [ {
        owner: { type: String, index: 1 },
        name: { type: String, index: 1 },
        fullName: { type: String, index: 1 },
        permissions: {
            admin: Boolean,
            push: Boolean,
            pull: Boolean
        }
    } ]
} );

userSchema.statics.getTokenForRepoFullName = function ( repoFullName, cb )
{
    return this.findOne( {
        "repos.fullName": repoFullName,
        "repos.permissions.push": true
    }, "oauth", cb );
};


models.Repo = mongoose.model( "repo", repoSchema );
models.Commit = mongoose.model( "commit", commitSchema );
models.User = mongoose.model( "user", userSchema );
