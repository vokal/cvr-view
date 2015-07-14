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

repoSchema.statics.findByOwnerAndName = function ( owner, name, cb )
{
    return this.findOne( { owner: owner, name: name }, cb );
};

repoSchema.statics.findFullNameInArray = function ( repoFullNames, commitCount, cb )
{
    return this.find( { fullName: { $in: repoFullNames } }, {
        provider: 1,
        owner: 1,
        name: 1,
        fullName: 1,
        token: 1,
        webhookId: 1,
        minPassingLinePercent: 1,
        commits: { $slice: -1 * ( commitCount || 10 ) }
    }, cb );
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