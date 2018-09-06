const config = require('./config');
const urls = {
    HOST_REDIRECT_URI: {
        DEPLOY: 'https://rcd-api.herokuapp.com/callback/',
        LOCAL: `http://localhost:${config.SERVER_PORT}/callback/`
    },
    GUEST_REDIRECT_URI: {
        DEPLOY: 'https://rcd-api.herokuapp.com/guestcallback/',
        LOCAL: `http://localhost:${config.SERVER_PORT}/guestcallback/`,
    },
    URL_ROOT: {
        DEPLOY: 'https://robots-cant-dance.herokuapp.com',
        LOCAL: 'http://localhost:'
    }
};

module.exports = urls;