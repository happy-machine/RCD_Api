// config.js
const config = {
    CLIENT_ID: process.env.CLIENT_ID || 'e37f4ec0f332475a897c624671c5449d',
    CLIENT_SECRET: process.env.CLIENT_SECRET || '12c9a9eaf6854037bd4c9ccfc55169cd',
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
    CHAT_ID: '-1001389216905',
    TELEGRAM_TOKEN: '645121157:AAFVvaehPv3fkN4mALIysCq27b5Q3gtyIPY',
    MAIN_ROOM: '-1001259716845',
    // URL
    HOST_REDIRECT_URI: MODE === DEPLOY ? 'https://rcd-api.herokuapp.com/callback/' : `http://localhost:${SERVER_PORT}/callback/`,
    GUEST_REDIRECT_URI: MODE === DEPLOY ? 'https://rcd-api.herokuapp.com/guestcallback/' : `http://localhost:${SERVER_PORT}/guestcallback/`,
    URL_ROOT: {
        DEPLOY: 'https://robots-cant-dance.herokuapp.com',
        LOCAL: 'http://localhost:'
    },
};

module.exports = config;