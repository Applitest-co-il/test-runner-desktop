const dotenv = require('dotenv');
dotenv.config({ path: '.env', debug: true });

const express = require('express');
const cors = require('cors');

const { downloadFile } = require('./download-file.js');
const { runTests, testApiCall, openSession, closeSession, runSession, libVersion } = require('@applitest/test-runner');

async function preProcessOptions(options) {
    if (!options) {
        return false;
    }

    // Additional checks can be added here
    if (['mobile', 'mixed'].includes(options?.runConfiguration?.runType)) {
        console.log('Received mobile run configuration');
        const session = options.runConfiguration.sessions.find((session) => session.type === 'mobile');
        if (session.appium?.app?.startsWith('s3:')) {
            const appName = session.appium.appName;
            const url = session.appium.app.replace('s3:', '');

            const appLocalPath = await downloadFile(url, appName);
            if (!appLocalPath) {
                console.error('App download failed');
                return false;
            }
            session.appium.app = appLocalPath;
        }
    } else if (options?.runConfiguration?.runType === 'web') {
        console.log('Received web run configuration');
    } else if (options?.runConfiguration?.runType === 'api') {
        console.log('Received API run configuration');
    } else {
        return false;
    }

    return true;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '500KB' }));

app.get('/version', (_, res) => {
    res.status(200).json({ version: libVersion.version });
});

app.post('/test-runner', async (req, res) => {
    console.log('Test runner started');

    if (!req.body) {
        res.status(400).send('No data found');
        return;
    }

    const options = req.body;
    if (!(await preProcessOptions(options))) {
        res.status(400).send('Invalid configuration');
        return;
    }

    options.runConfiguration.videosPath = process.env.VIDEOS_PATH;

    let output = {};
    try {
        output = await runTests(options);
    } catch (error) {
        console.log(`Error running test: ${error}`);

        output = {
            success: false,
            error: error.message,
            summary: {
                suites: 0,
                passedSuites: 0,
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                pending: 0
            },
            suiteResults: [],
            executionTime: 0
        };
    }

    res.status(200).json(output);
});

app.post('/test-runner/session', async (req, res) => {
    console.log('Test runner open session started');

    if (!req.body) {
        res.status(400).send('No data found');
        return;
    }

    const options = req.body;
    if (!(await preProcessOptions(options))) {
        res.status(400).send('Invalid configuration');
        return;
    }

    let output = {};
    try {
        output = await openSession(options);
    } catch (error) {
        console.log(`Error opening debug session: ${error}`);
    }

    res.status(200).json(output);
});

app.patch('/test-runner/session/:sessionId', async (req, res) => {
    console.log('Test runner run debug steps started');

    if (!req.body) {
        res.status(400).send('No data found');
        return;
    }

    const sessionId = req.params.sessionId;
    const options = req.body.options;

    let output = {};
    try {
        output = await runSession(sessionId, options);
    } catch (error) {
        console.log(`Error running session: ${error}`);
    }

    res.status(200).json(output);
});

app.delete('/test-runner/session/:sessionId', async (req, res) => {
    console.log('Test runner close session started');

    const sessionId = req.params.sessionId;
    if (!sessionId) {
        res.status(400).send('No session ID found');
        return;
    }

    let output = {};
    try {
        output = await closeSession(sessionId);
    } catch (error) {
        console.log(`Error closing session: ${error}`);
    }

    res.status(200).json(output);
});

app.patch('/api', async (req, res) => {
    console.log('Test API call started');

    if (!req.body) {
        res.status(400).send('No data found');
        return;
    }

    const method = req.body.method;
    const path = req.body.path;
    const headers = req.body.headers;
    const data = req.body.data;
    const schema = req.body.schema || null;
    const variables = req.body.variables || {};
    const outputs = req.body.outputs || [];

    if (!method || !path) {
        res.status(400).send('Invalid request - method and path are required');
        return;
    }

    const result = await testApiCall(method, path, headers, data, schema, variables, outputs);
    if (result) {
        res.status(200).json(result);
    } else {
        res.status(500).send('API call failed');
    }
    console.log('Test API call completed');
});

let server = null;

function startServer(port = process.env.TR_PORT || 3000) {
    if (server) {
        return server;
    }

    server = app.listen(port, () => {
        console.log(`Server started on port ${port}`);
    });

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
    app,
    startServer,
    stopServer,
    server: () => server
};

// If this file is run directly (not required), start the server
if (require.main === module) {
    startServer();
}
