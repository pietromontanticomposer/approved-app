const originalWarn = console.warn.bind(console);

console.warn = (...args) => {
  if (
    typeof args[0] === "string" &&
    args[0].startsWith("[baseline-browser-mapping] The data in this module is over two months old.")
  ) {
    return;
  }

  originalWarn(...args);
};
