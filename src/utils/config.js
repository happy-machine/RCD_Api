require('dotenv').config();
import {DEPLOY, LOCAL, REMOTE} from './constants'

const config = {
    CLIENT_ID: process.env.CLIENT_ID || 'e37f4ec0f332475a897c624671c5449d',
    CLIENT_SECRET: process.env.CLIENT_SECRET || '12c9a9eaf6854037bd4c9ccfc55169cd',
    SERVER_PORT: process.env.PORT || 5000,
    CLIENT_PORT: 3000,
    MODE: DEPLOY,
    // Spotify
    PERMISSIONS_SCOPE: 'user-read-currently-playing user-modify-playback-state user-read-playback-state streaming user-read-private',
    STATE_KEY: 'spotify_auth_state',
    PLAYBACK_DELAY: 0,
    // Telegram
    CHAT_ID: process.env.CHAT_ID || null,
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN || null,
    MAIN_ROOM: process.env.MAIN_ROOM || null,
};

module.exports = config;