const dotenv = require('dotenv');
dotenv.config({ path: '.env', debug: true });

const { createLocalTestRunner } = require('@applitest/test-runner');

let server = null;

function startServer(port = process.env.TR_PORT || 3000) {
    if (server) {
        return server;
    }

    server = createLocalTestRunner(port);

    return server;
}

function stopServer() {
    if (server) {
        server.close();
        server = null;
        console.log('Server stopped');
    }
}

// Export the functions and app for use in Electron
module.exports = {
    startServer,
    stopServer,
    server: () => server
};

// If this file is run directly (not required), start the server
if (require.main === module) {
    startServer();
}
