"use strict";

var mongoose = require('mongoose');

var models = {};

module.exports = models;

var repoSchema = mongoose.Schema({
    provider: String,
    owner: String,
    name: String,
    fullName: String,
    token: String,
    webhookId: String,
    minPassingLinePercent: { type: Number, default: 80 },
    commits: [{
        hash: String,
        coverage: String,
        coverageType: { type: String, default: "lcov" },
        linePercent: Number,
        isPullRequest: { type: Boolean, default: false }
    }]
});

var getCommitFilter = function ( commitCount )
{
    return {
        provider: 1,
        owner: 1,
        name: 1,
        fullName: 1,
        token: 1,
        webhookId: 1,
        minPassingLinePercent: 1,
        commits: { $slice: -1 * commitCount }
    };
};

repoSchema.statics.findByOwnerAndName = function ( owner, name, commitCount, cb )
{
    return this.findOne( { owner: owner, name: name }, getCommitFilter( commitCount ), cb );
};

repoSchema.statics.findByToken = function ( token, commitCount, cb )
{
    return this.findOne( { token: token }, getCommitFilter( commitCount ), cb );
};

repoSchema.statics.findFullNameInArray = function ( repoFullNames, commitCount, cb )
{
    return this.find( { fullName: { $in: repoFullNames } }, getCommitFilter( commitCount ), cb );
};

repoSchema.statics.findCommit = function ( owner, name, hash, cb )
{
    return this.findOne( { owner: owner, name: name }, { commits: { $elemMatch: { hash: hash } } }, cb );
};

repoSchema.statics.findCommitList = function ( owner, name, cb )
{
    return this.findOne( { owner: owner, name: name }, { "commits.hash": 1, "commits.isPullRequest": 1 }, cb );
};

repoSchema.statics.pushCommit = function ( _id, commit, cb )
{
    return this.update( { _id: _id }, { $push: { commits: { $each: [ commit ], $slice: -20 } } }, cb );
};

var userSchema = mongoose.Schema( {
    oauth: {
        provider: String,
        username: String,
        token: String
    },
    repos: [{
        owner: String,
        name: String,
        fullName: String
    }]
} );

userSchema.statics.getTokenForRepoFullName = function ( repoFullName, cb )
{
    return this.findOne( { "repos.fullName": repoFullName }, "oauth.token", cb );
};


models.Repo = mongoose.model( "repo", repoSchema );
models.User = mongoose.model( "user", userSchema );