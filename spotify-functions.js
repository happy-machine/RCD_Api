/*jshint esversion: 6 */
require('dotenv').config();
const CLIENT_ID = process.env.CLIENT_ID; 
const CLIENT_SECRET = process.env.CLIENT_SECRET; 

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
      
    authOptions: (redirect_uri, code) => {
        return {
            url: 'https://accounts.spotify.com/api/token',
            form: {
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code'
            },
            headers: {
            'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            },
            json: true
        }
    },

    getAlbum: (user, track_uri) => {
        console.log('getting album')
        return {
            uri: 'https://api.spotify.com/v1/tracks/' + track_uri,
            headers: { 
                'Authorization': 'Bearer ' + user.token,
                'Content-Type': 'application/json'
            },
            json: true 
        }
    }
      
};