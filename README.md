# ROBOTS CAN'T DANCE

## What's RCD?

RCD is a fun web-app that allows people invited to a room to sync their spotify playback. The accounts will remain synced until a user logs out. You can either control track selection from the input box which will search the spotify api for tracks, or from spotify itself. (While connected this is effectively headless and will sync to Spotify state as controlled by any linked spotify player)

You can use the toolbar to copy an invite link to clipboard or open a persistant mini modal that will display the latest chat messages and give you control over realtime effects and track control in the background while you work


## Getting started

```shell
# Clone the repo from github
git clone https://github.com/happy-machine/RCD_Api.git

# Create .env file from env.example
cp env.example .env

# Set CLIENT_ID and CLIENT_SECRET in .env file
vim .env

# Install or update dependencies
npm install

# Generate a production build
npm run build

# Run server
node build/server.js
```

## Demo

There is a [live demo](https://robots-cant-dance.herokuapp.com/) running on heroku.
