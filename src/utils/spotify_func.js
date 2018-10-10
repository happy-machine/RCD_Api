/*jshint esversion: 6 */
require('dotenv').config();
import { sendMessage } from '../server'
import { REFRESH_TOKEN } from './constants'
const rp = require('request-promise');
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

    getUserDevices: (user) => {
        return { 
            method: 'GET',
            uri: 'https://api.spotify.com/v1/me/player/devices',
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

    setPause: (user) => {  
        return {
                method: 'PUT',
                uri: 'https://api.spotify.com/v1/me/player/pause',
                headers: { 'Authorization': 'Bearer ' + user.token },
                json: true 
            }
    },
      
    setPlay: (user) => {  
        return {
                method: 'PUT',
                uri: 'https://api.spotify.com/v1/me/player/play',
                headers: { 'Authorization': 'Bearer ' + user.token },
                json: true 
            }
    },
    
    authOptions: (redirect_uri, code) => {
        return {
            url: 'https://accounts.spotify.com/api/token',
            form: {
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code',
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
    spotifyOptions: (uri, state) => {
        return {
            response_type: 'code',
            client_id: config.CLIENT_ID,
            scope: config.PERMISSIONS_SCOPE,
            redirect_uri: uri,
            state
        }
      } ,

    rpSafe: (options, user) => {
        return new Promise((resolve, fail) => {

            if (user && user.token_expiry - new Date().getTime() <= 3000) {


                rp.post({

                    url: 'https://accounts.spotify.com/api/token',
                    headers: {
                        'Authorization': 'Basic ' + (new Buffer(config.CLIENT_ID + ':' + config.CLIENT_SECRET).toString('base64'))
                    },
                    form: {

                        grant_type: 'refresh_token',
                        refresh_token: user.refresh_token

                    },

                    json: true

                }, function (error, response, body) {

                    if (!error && response.statusCode === 200) {
                        console.log ("Refreshed Token, Will expire in: " + body.expires_in)
                        user.token = body.access_token
                        sendMessage(JSON.stringify({ type: REFRESH_TOKEN, token: user.token }))
                        var exp = (Math.floor (body.expires_in / 60) * 7000)
                        user.token_expiry = new Date().getTime() + exp
                        resolve (rp (options))
                    } else {
                        fail(console.log('Error in refresh call\n'))
                    }
                })
            } else {
                resolve(rp(options))
            }

        })
    },
};
