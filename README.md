# Node.js Time Clock to Wake on Lan listener.

This project was created for the 2016 Tanda Hackathon.

It's a basic WoL server that needs to be run on your local network. Once configured with your API keys and run you'll also need to confirm access to the API through a web interface. Once configured it will poll the API once per minute checking for new sign in events.

You will need to edit the configuration file with your users ID's found in the URL's of the Admin interface and associate them with the user's machine's mac address. Also all machines used by the system will need to be configured to receive WoL packets over Ethernet, this will not work over WiFi because of arcitectural restrictions with the protocols and hardware power states.

Hope you find this useful. Pull requests are welcome. Also you may wish to up the polling rate against the API especially if you're using this in a small office. However for the Hackathon the API was restricted to 100 requests a minute hence the 1 minute polling.

## Setup

1. Install `node` through your package manager of choice, or from https://nodejs.org/en/
- Download/Clone this repository and navigate to the `node_server` folder
- Run `npm i`
- Create an application through the [Tanda Developer Portal](https://my.tanda.co/api/oauth/applications)
  - Set the Redirect URI to be `http://localhost:6789/callback`
- Edit `index.js` and replace `YOUR_APPLICATION_ID` and `YOUR_APPLICATION_SECRET` with your application id and secret

## Running

Simply run `node index.js` to start the server.
