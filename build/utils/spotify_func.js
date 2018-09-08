'use strict';

/*jshint esversion: 6 */
require('dotenv').config();
var config = require('./config');

module.exports = {

    getUserOptions: function getUserOptions(user) {
        return {
            method: 'GET',
            uri: 'https://api.spotify.com/v1/me',
            headers: { 'Authorization': 'Bearer ' + user.token },
            json: true
        };
    },

    getPlaybackOptions: function getPlaybackOptions(user) {
        return {
            uri: 'https://api.spotify.com/v1/me/player/currently-playing',
            headers: {
                'Authorization': 'Bearer ' + user.token,
                'Content-Type': 'application/json'
            },
            json: true
        };
    },

    setPlaybackOptions: function setPlaybackOptions(user, master) {
        var delay = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

        return {
            method: 'PUT',
            uri: 'https://api.spotify.com/v1/me/player/play',
            headers: { 'Authorization': 'Bearer ' + user.token },
            json: true,
            body: {
                "uris": [master.track_uri],
                "position_ms": master.play_position - delay
            }
        };
    },

    authOptions: function authOptions(redirect_uri, code) {
        return {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + new Buffer(config.CLIENT_ID + ':' + config.CLIENT_SECRET).toString('base64')
            },
            json: true
        };
    },

    getTrack: function getTrack(user, track_uri) {
        return {
            uri: 'https://api.spotify.com/v1/tracks/' + track_uri,
            headers: {
                'Authorization': 'Bearer ' + user.token,
                'Content-Type': 'application/json'
            },
            json: true
        };
    },
    spotifyOptions: function spotifyOptions(uri, state) {
        return {
            response_type: 'code',
            client_id: config.CLIENT_ID,
            scope: config.PERMISSIONS_SCOPE,
            redirect_uri: uri,
            state: state
        };
    }
};
//# sourceMappingURL=spotify_func.js.map