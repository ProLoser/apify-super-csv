import { Actor } from 'apify';

import { gotScraping } from 'got-scraping';
import neatCsv from 'neat-csv';
// Initialize the Apify SDK
await Actor.init();

const { csvUrls, separator = ',', fieldNames } = await Actor.getValue('INPUT') || {};

const urls = (csvUrls || []).map((req) => req?.url || req?.requestsFromUrl).filter(Boolean);

if (!urls.length) {
    await Actor.fail('No CSV URLs provided. Please provide at least one URL in the csvUrls input field.');
}

await Actor.setStatusMessage(`Received ${urls.length} CSV URLs. Starting download.`);

const parseOptions = { separator };
if (Array.isArray(fieldNames) && fieldNames.length > 0) {
    parseOptions.headers = fieldNames;
}

for (const url of urls) {
    const { body } = await gotScraping(url);
    let data;
    try {
        data = await neatCsv(body.toString(), parseOptions);
    } catch (e) {
        await Actor.fail(`Could not convert file to CSV with error: ${e}`)
    }
    await Actor.setStatusMessage(`Received ${data.length} rows from ${url}. Starting to push to the dataset, this might take a while.`);
    await Actor.pushData(data);
}

await Actor.exit(`CSV successfully converted to a dataset with ID: ${Actor.getEnv().defaultDatasetId}`);