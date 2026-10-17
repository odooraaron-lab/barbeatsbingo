// Fills in what pdf.js needs on older iPhones and iPads. Every browser there (Safari,
// Chrome, Firefox) uses Safari's engine, so they all lack the same things:
//
// - Promise.withResolvers, before iOS 17.4.
// - Looping over a stream with `for await`, before iOS 27. pdf.js reads each page's
//   text that way, so without it the track list can't be drawn at all.
//
// It runs in the page before pdf.js loads, and first thing in pdf.js's worker
// (scripts/copy-pdf-worker.mjs puts a copy next to the worker). Plain JavaScript so
// the same file works in both places.

if (typeof Promise.withResolvers !== "function") {
  Object.defineProperty(Promise, "withResolvers", {
    configurable: true,
    writable: true,
    value: function withResolvers() {
      let resolve, reject;
      const promise = new this((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    },
  });
}

if (typeof ReadableStream !== "undefined" && typeof ReadableStream.prototype[Symbol.asyncIterator] !== "function") {
  const values = async function* values(options) {
    const reader = this.getReader();
    let finished = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          finished = true;
          return;
        }
        yield value;
      }
    } finally {
      // Leaving the loop early cancels the stream, as the standard says.
      if (!finished && !options?.preventCancel) await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  };
  for (const key of ["values", Symbol.asyncIterator]) {
    Object.defineProperty(ReadableStream.prototype, key, { configurable: true, writable: true, value: values });
  }
}
