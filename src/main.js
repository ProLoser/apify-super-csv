import { Actor } from 'apify';
import { gotScraping } from 'got-scraping';
import neatCsv from 'neat-csv';

import { run } from './processor.js';

// Initialize the Apify SDK
await Actor.init();

await run(Actor, gotScraping, neatCsv);
