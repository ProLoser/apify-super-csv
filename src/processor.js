export async function run(actor, fetcher, parser) {
    const { csvUrls, separator = ',', fieldNames } = await actor.getValue('INPUT') || {};

    const urls = (csvUrls || []).map((req) => req?.url || req?.requestsFromUrl).filter(Boolean);

    if (!urls.length) {
        await actor.fail('No CSV URLs provided. Please provide at least one URL in the csvUrls input field.');
        return;
    }

    await actor.setStatusMessage(`Received ${urls.length} CSV URLs. Starting download.`);

    const parseOptions = { separator };
    if (Array.isArray(fieldNames) && fieldNames.length > 0) {
        parseOptions.headers = fieldNames;
    }

    for (const url of urls) {
        const { body } = await fetcher(url);
        let data;
        try {
            data = await parser(body.toString(), parseOptions);
        } catch (e) {
            await actor.fail(`Could not convert file to CSV with error: ${e}`);
            return;
        }
        await actor.setStatusMessage(`Received ${data.length} rows from ${url}. Starting to push to the dataset, this might take a while.`);
        await actor.pushData(data);
    }

    await actor.exit(`CSV successfully converted to a dataset with ID: ${actor.getEnv().defaultDatasetId}`);
}
