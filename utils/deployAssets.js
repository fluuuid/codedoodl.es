#!/usr/bin/env node

// config is coffee....
require('coffee-script/register');

var fs     = require('fs');
var s3     = require('s3');
var path   = require('path');
var argv   = require('yargs').argv;
var config = require('../config/server');

var gzippableRe = /\.(css|js|svg|gz)(?:$|\?)/;
var versionedRe = /\.(css|js)(?:$|\?)/;

function getS3Params(file, stat, cb) {
    var s3Params = {};

    if (gzippableRe.test(path.extname(file))) {
        s3Params.ContentEncoding = 'gzip';
    }

    if (versionedRe.test(path.extname(file))) {
        s3Params.Expires = new Date((new Date).setYear((new Date).getFullYear() + 1))
    }

    cb(null, s3Params);
}

function getUploadParams(isProduction) {
    var params = {
        localDir: "app/public/",
        deleteRemoved: false, // default false, whether to remove s3 objects 
                              // that have no corresponding local file.
        s3Params: {
            Bucket: config.buckets.ASSETS
            // other options supported by putObject, except Body and ContentLength. 
            // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property 
        },

        getS3Params: getS3Params
    };

    return params;
}

function getClient(creds) {
    var client = s3.createClient({
        maxAsyncS3: 20,     // this is the default
        s3RetryCount: 3,    // this is the default
        s3RetryDelay: 1000, // this is the default
        multipartUploadThreshold: 20971520, // this is the default (20 MB)
        multipartUploadSize: 15728640, // this is the default (15 MB)
        s3Options: {
            accessKeyId: creds.aws.id,
            secretAccessKey: creds.aws.key,
            region : creds.aws.region
            // any other options are passed to new AWS.S3()
            // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
        },
    });

    return client;
}

function startUploader(client, params, cb) {
    var uploader = client.uploadDir(params);
    uploader.on('error', function(err) {
        console.error("unable to sync:", err.stack);
    });
    uploader.on('progress', function() {
        console.log("progress", uploader.progressAmount, uploader.progressTotal);
    });
    uploader.on('end', function() {
        console.log("done uploading");
    });
}

module.exports = function deploy() {
    var isProduction = !!argv.production;
    var creds = {}, client, uploadParams;

    try {
        creds = require('../credentials.coffee');
    } catch (e) {
        throw new Error('Wat... No credentials.coffee file... No access')
    }

    client = getClient(creds);
    uploadParams = getUploadParams(isProduction);

    startUploader(client, uploadParams);
};
