process.env.BROWSERSLIST_IGNORE_OLD_DATA = "true";
process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA = "true";
const warnHook = "--require=./scripts/silence-baseline-warning.cjs";
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS
  ? process.env.NODE_OPTIONS.includes(warnHook)
    ? process.env.NODE_OPTIONS
    : `${process.env.NODE_OPTIONS} ${warnHook}`
  : warnHook;

require("./silence-baseline-warning.cjs");
require("next/dist/bin/next");
