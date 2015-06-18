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
    commits: [{
        hash: String,
        coverage: String,
        linePercent: Number
    }]
});

repoSchema.statics.findByOwnerAndName = function ( owner, name, cb )
{
    return this.findOne( { owner: owner, name: name }, cb );
};

repoSchema.statics.findFullNameInArray = function ( repoFullNames, cb )
{
    return this.find( { fullName: { $in: repoFullNames } }, cb );
};

var userSchema = mongoose.Schema({
    oauth: {
        provider: String,
        username: String
    },
    repos: [{
        owner: String,
        name: String,
        fullName: String
    }]
});

models.Repo = mongoose.model( "repo", repoSchema );
models.User = mongoose.model( "user", userSchema );