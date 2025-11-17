#!/usr/bin/env node
// Run Stage1 batches until no new articles remain or a max runtime is reached.
const { processStage1Batches } = require("../dist/server/pipeline/stage1Batch");
const { makeRawRepo } = require("../dist/server/pipeline/poller");

const batchSize = Number(process.env.STAGE1_BATCH_SIZE || "50");
const maxMinutes = Number(process.env.STAGE1_MAX_MINUTES || "10");

(async () => {
  const start = Date.now();
  const repo = makeRawRepo();
  while (true) {
    const elapsedMin = (Date.now() - start) / 60000;
    if (elapsedMin >= maxMinutes) {
      console.log(`Stopping after reaching max runtime ${maxMinutes} minutes`);
      break;
    }
    const processed = await processStage1Batches(repo, batchSize, true);
    if (processed === 0) {
      console.log("No more unprocessed articles; exiting");
      break;
    }
  }
  console.log("Stage1 batch runner finished.");
})().catch((err) => {
  console.error("Stage1 batch runner failed", err);
  process.exit(1);
});
