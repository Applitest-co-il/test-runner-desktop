const axios = require('axios');
const fs = require('fs');

const { URL } = require('url'); // For secure URL parsing/validation

// Define an allow-list of trusted hostnames/endpoints (adjust as appropriate)
// if host start and ends with / it's treated as regex pattern, if not as exact match
// eslint-disable-next-line no-useless-escape
const ALLOWED_HOSTS = ['s3.amazonaws.com', '/.*\\.s3\\..*\\.amazonaws\\.com$/'];

function isAllowedUrl(urlString) {
    try {
        const parsedUrl = new URL(urlString, 'https://dummy-base.com'); // fallback base for relative
        // Enforce HTTPS
        if (parsedUrl.protocol !== 'https:') return false;
        // Check host allow-list
        let isAllowedHost = false;
        for (const host of ALLOWED_HOSTS) {
            if (host.startsWith('/') && host.endsWith('/')) {
                // Regular expression pattern
                const pattern = host.slice(1, -1); // Remove leading and trailing slashes
                const regex = new RegExp(pattern);
                if (regex.test(parsedUrl.hostname)) {
                    isAllowedHost = true;
                    break;
                }
            } else {
                // Exact string match
                if (parsedUrl.hostname === host) {
                    isAllowedHost = true;
                    break;
                }
            }
        }
        if (!isAllowedHost) return false;
        // Optionally block suspicious characters (path traversal, etc)
        if (parsedUrl.pathname && (parsedUrl.pathname.includes('..') || parsedUrl.pathname.includes('//')))
            return false;
        return true;
    } catch (e) {
        console.error(`Invalid URL: ${urlString} - ${e.message}`);
        return false;
    }
}

async function downloadFile(url, fileName, override = false) {
    const fileLocalPath =
        process.env.NODE_ENV == 'prod' ? `/tmp/${fileName}` : `${process.cwd()}/downloads/${fileName}`;

    if (!override) {
        const existLocalApp = fs.existsSync(fileLocalPath);
        if (existLocalApp) {
            console.log(`App ${fileLocalPath} already downloaded`);
            return fileLocalPath;
        }
    }

    // SSRF protection: Only allow URLs from trusted hosts
    if (!isAllowedUrl(url)) {
        console.error(`Blocked attempt to download from disallowed URL: ${url}`);
        return null;
    }

    console.log(`Downloading file from ${url} to ${fileLocalPath}`);

    let downloadResponse = null;
    try {
        downloadResponse = await axios({
            url: url,
            method: 'GET',
            responseType: 'stream'
        });
    } catch (error) {
        console.error(`Error downloading file ${url}: ${error}`);
        return null;
    }

    console.log(`Download response status: ${downloadResponse.status}`);
    console.log(`Starting saving file to ${fileLocalPath}`);

    const writer = fs.createWriteStream(fileLocalPath);
    downloadResponse.data.pipe(writer);

    const promise = new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
    return promise
        .then(() => {
            console.log(`File downloaded successfully ${fileLocalPath}`);
            return fileLocalPath;
        })
        .catch((error) => {
            console.error(`Error downloading file ${url}: ${error}`);
            return null;
        });
}

module.exports = { downloadFile };
