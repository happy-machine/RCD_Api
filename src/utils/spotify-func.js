/*jshint esversion: 6 */
require('dotenv').config();
const config = require('./config');

module.exports = {

    getUserOptions: (user) => {
        return { 
            method: 'GET',
            uri: 'https://api.spotify.com/v1/me',
            headers: { 'Authorization': 'Bearer ' + user.token },
            json: true 
        }
    },
      
    getPlaybackOptions: (user) => {
        return {
            uri: 'https://api.spotify.com/v1/me/player/currently-playing',
            headers: { 
                'Authorization': 'Bearer ' + user.token,
                'Content-Type': 'application/json'
            },
            json: true 
        }
    },
      
    setPlaybackOptions: (user, master, delay = 1) => {  
    return {
            method: 'PUT',
            uri: 'https://api.spotify.com/v1/me/player/play',
            headers: { 'Authorization': 'Bearer ' + user.token },
            json: true ,
            body: {
                "uris": [master.track_uri],
                "position_ms": master.play_position - delay
            }
        }
    },
      
    authOptions: (redirect_uri, state) => {
        return {
            url: 'https://accounts.spotify.com/api/token',
            form: {
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code',
            state
            },
            headers: {
            'Authorization': 'Basic ' + (new Buffer(config.CLIENT_ID + ':' + config.CLIENT_SECRET).toString('base64'))
            },
            json: true
        }
    },

    getTrack: (user, track_uri) => {
        return {
            uri: 'https://api.spotify.com/v1/tracks/' + track_uri,
            headers: { 
                'Authorization': 'Bearer ' + user.token,
                'Content-Type': 'application/json'
            },
            json: true 
        }
    },
    spotifyOptions: {
        response_type: 'code',
        client_id: config.CLIENT_ID,
        scope: config.PERMISSIONS_SCOPE,
        redirect_uri: config.HOST_REDIRECT_URI,
      } ,
};
