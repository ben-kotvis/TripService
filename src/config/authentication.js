﻿'use strict';

/**
 *  This module is use to define authentication
 *  @module tripService
 *  @author shweta.ghenand
 *  @version 1.0.0
 */


/**
*  import project module
*/
var HttpStatus = require('http-status-codes');
var JWT = require('jsonwebtoken');
var redis = require("redis");
var config = require('./config.json');
var redisConnectionObj = config[config.activeEnv].redis;
config = config[config.activeEnv].auth;
var util = require("../util/commonUtil");
var responseConstant = require("../constant/responseConstant");
var db = require("../config/databaseConnection");
var client = redis.createClient(redisConnectionObj.port, redisConnectionObj.host, redisConnectionObj.option);

module.exports = {
    isAuthenticate: function (req, res, next) {
        if (req.headers && req.headers.authorization) {
            try {
                var decoded = JWT.verify(req.headers.authorization, config.JWT_SECRET_FOR_ACCESS_TOKEN);

                if (decoded.exp <= Date.now()) {//check for token expiration
                    res.status(HttpStatus.UNAUTHORIZED).send(util.responseUtil(null, null, responseConstant.UNAUTHORIZE));
                } else {
                    if (decoded && decoded.user && decoded.user.id) {//check jwt contains user info 
                        client.get(decoded.user.id, function (err, result) { //get token from user                    
                            if (err) {
                                res.status(HttpStatus.UNAUTHORIZED).send(util.responseUtil(err, null, responseConstant.UNAUTHORIZE));
                            } else {
                                if (req.headers.authorization === result) { //verify token
                                    req.user = decoded.user;
                                    next();
                                } else
                                    res.status(HttpStatus.UNAUTHORIZED).send(util.responseUtil(null, null, responseConstant.UNAUTHORIZE));
                            }
                        });
                    } else {
                        res.status(HttpStatus.UNAUTHORIZED).send(util.responseUtil(null, null, responseConstant.UNAUTHORIZE));
                    }
                }
            } catch (err) {
                res.status(HttpStatus.UNAUTHORIZED).send(util.responseUtil(err, null, responseConstant.UNAUTHORIZE));
            }
        } else {
            res.status(HttpStatus.UNAUTHORIZED).send(util.responseUtil(null, null, responseConstant.UNAUTHORIZE));
        }
    },

    isTenantIDValid: function (req, tenantId) {
        return new Promise(function (resolve, reject) {
            try {
                var decoded = JWT.verify(req.headers.authorization, config.JWT_SECRET_FOR_ACCESS_TOKEN);
                var dbName = '';

                if (decoded.user.roleName === 'super admin') {//check whether tenantId is valid or not
                    dbName = "trip_" + tenantId + "_db";
                    db.getDatabaseConnection(dbName, function (err, dbInstance) {
                        if (dbInstance)
                            return resolve(util.responseUtil(null, null, responseConstant.SUCCESS));
                        else {
                            return reject(util.responseUtil(null, null, responseConstant.DB_CONNECTION_FAILED));
                        }
                    })
                }
                else if (decoded.user.tenantId === tenantId) {//check whether tenantId is valid or not
                    dbName = "trip_" + tenantId + "_db";
                    db.getDatabaseConnection(dbName, function (err, dbInstance) {
                        if (dbInstance)
                            return resolve(util.responseUtil(null, null, responseConstant.SUCCESS));
                        else {
                            return reject(util.responseUtil(null, null, responseConstant.DB_CONNECTION_FAILED));
                        }
                    })

                }
                else {
                    return reject(util.responseUtil(null, null, responseConstant.INVALID_TENANTID));
                }

            } catch (err) {
                return reject(util.responseUtil(err, null, responseConstant.INVALID_TENANTID));
            }

        });
    }
}
