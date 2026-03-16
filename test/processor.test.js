import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/processor.js';

const makeMockActor = (input = {}) => ({
    getValue: async () => input,
    fail: async (msg) => { throw new Error(msg); },
    setStatusMessage: async () => {},
    pushData: async () => {},
    exit: async () => {},
    getEnv: () => ({ defaultDatasetId: 'test-dataset-id' }),
});

const makeCsvParser = () => async (body, options) => {
    const sep = options.separator || ',';
    const lines = body.split('\n').filter(Boolean);
    if (lines.length === 0) return [];
    const headers = options.headers || lines[0].split(sep);
    const dataLines = options.headers ? lines : lines.slice(1);
    return dataLines.map((line) => {
        const values = line.split(sep);
        return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });
};

describe('processor.run', () => {
    it('fails when no csvUrls are provided', async () => {
        let failMsg;
        const actor = { ...makeMockActor({ csvUrls: [] }), fail: async (msg) => { failMsg = msg; } };
        await run(actor, null, null);
        assert.ok(failMsg.includes('No CSV URLs provided'));
    });

    it('fails when csvUrls input is missing', async () => {
        let failMsg;
        const actor = { ...makeMockActor(null), fail: async (msg) => { failMsg = msg; } };
        await run(actor, null, null);
        assert.ok(failMsg.includes('No CSV URLs provided'));
    });

    it('fetches and parses a CSV URL and pushes rows to dataset', async () => {
        const pushed = [];
        const actor = {
            ...makeMockActor({ csvUrls: [{ url: 'http://example.com/data.csv' }] }),
            pushData: async (data) => { pushed.push(...data); },
        };
        const fetcher = async () => ({ body: 'name,age\nAlice,30\nBob,25' });

        await run(actor, fetcher, makeCsvParser());

        assert.equal(pushed.length, 2);
        assert.deepEqual(pushed[0], { name: 'Alice', age: '30' });
        assert.deepEqual(pushed[1], { name: 'Bob', age: '25' });
    });

    it('uses requestsFromUrl field when url field is absent', async () => {
        const fetchedUrls = [];
        const actor = {
            ...makeMockActor({
                csvUrls: [{ requestsFromUrl: 'http://example.com/list.csv' }],
            }),
            pushData: async () => {},
        };
        const fetcher = async (url) => { fetchedUrls.push(url); return { body: 'a\n1' }; };

        await run(actor, fetcher, makeCsvParser());

        assert.deepEqual(fetchedUrls, ['http://example.com/list.csv']);
    });

    it('uses custom field names instead of CSV header row', async () => {
        let capturedOptions;
        const actor = {
            ...makeMockActor({
                csvUrls: [{ url: 'http://example.com/data.csv' }],
                fieldNames: ['first_name', 'years'],
            }),
            pushData: async () => {},
        };
        const fetcher = async () => ({ body: 'Alice,30\nBob,25' });
        const parser = async (body, options) => { capturedOptions = options; return []; };

        await run(actor, fetcher, parser);

        assert.deepEqual(capturedOptions.headers, ['first_name', 'years']);
    });

    it('uses custom separator when provided', async () => {
        let capturedOptions;
        const actor = {
            ...makeMockActor({
                csvUrls: [{ url: 'http://example.com/data.csv' }],
                separator: ';',
            }),
            pushData: async () => {},
        };
        const fetcher = async () => ({ body: 'name;age\nAlice;30' });
        const parser = async (body, options) => { capturedOptions = options; return []; };

        await run(actor, fetcher, parser);

        assert.equal(capturedOptions.separator, ';');
    });

    it('stops processing and calls fail when CSV parsing throws', async () => {
        let failMsg;
        const actor = {
            ...makeMockActor({ csvUrls: [{ url: 'http://example.com/bad.csv' }] }),
            fail: async (msg) => { failMsg = msg; },
            pushData: async () => { throw new Error('should not reach pushData'); },
        };
        const fetcher = async () => ({ body: 'bad-data' });
        const parser = async () => { throw new Error('parse error'); };

        await run(actor, fetcher, parser);

        assert.ok(failMsg.includes('Could not convert file to CSV'));
        assert.ok(failMsg.includes('parse error'));
    });

    it('processes multiple URLs in order', async () => {
        const pushed = [];
        const actor = {
            ...makeMockActor({
                csvUrls: [
                    { url: 'http://example.com/a.csv' },
                    { url: 'http://example.com/b.csv' },
                ],
            }),
            pushData: async (data) => { pushed.push(...data); },
        };
        const responses = {
            'http://example.com/a.csv': 'id\n1',
            'http://example.com/b.csv': 'id\n2',
        };
        const fetcher = async (url) => ({ body: responses[url] });

        await run(actor, fetcher, makeCsvParser());

        assert.equal(pushed.length, 2);
        assert.deepEqual(pushed[0], { id: '1' });
        assert.deepEqual(pushed[1], { id: '2' });
    });
});
