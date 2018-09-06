// config.js
const config = {
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    DEPLOY: 'DEPLOY',
    LOCAL: 'LOCAL',
    SERVER_PORT: process.env.PORT || 5000,
    CLIENT_PORT: 3000,
    MODE: 'DEPLOY',
    // Spotify
    PERMISSIONS_SCOPE: 'user-read-currently-playing user-modify-playback-state user-read-playback-state streaming user-read-private',
    STATE_KEY: 'spotify_auth_state',
    PLAYBACK_DELAY: 0,
    // Telegram
    CHAT_ID: process.env.CHAT_ID,
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
    MAIN_ROOM: process.env.MAIN_ROOM,
    // URL
    HOST_REDIRECT_URI: MODE === DEPLOY ? 'https://rcd-api.herokuapp.com/callback/' : `http://localhost:${SERVER_PORT}/callback/`,
    GUEST_REDIRECT_URI: MODE === DEPLOY ? 'https://rcd-api.herokuapp.com/guestcallback/' : `http://localhost:${SERVER_PORT}/guestcallback/`,
    URL_ROOT: {
        DEPLOY: 'https://robots-cant-dance.herokuapp.com',
        LOCAL: 'http://localhost:'
    },
};

module.exports = config;