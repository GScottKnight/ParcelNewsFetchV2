#!/usr/bin/env node
// Verifies Stage2 batch runner exits cleanly when there are no candidates.
const { processStage2Batches } = require("../dist/server/pipeline/stage2Batch");
const { makeRawRepo } = require("../dist/server/pipeline/poller");

(async () => {
  const repo = makeRawRepo();
  const processed = await processStage2Batches(repo, 5, 1);
  console.log("Stage2 processed count", processed);
  if (processed !== 0) {
    console.error("Expected zero processed when no candidates exist");
    process.exit(1);
  }
})();
