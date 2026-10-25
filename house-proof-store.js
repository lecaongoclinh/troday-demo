// Local wireframe storage. Production uploads must use a private file service.
window.houseProofStore = (() => {
  let database;
  const open = () => database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open("troday-house-proofs-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(request.error); };
  });
  return {
    async save(entries, ownerId) {
      const db = await open();
      const records = await Promise.all(entries.map(async ({ file, documentType }) => ({
        id: crypto.randomUUID(), ownerId, documentType, name: file.name, type: file.type, size: file.size,
        sha256: [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))].map((value) => value.toString(16).padStart(2, "0")).join(""), blob: file
      })));
      await new Promise((resolve, reject) => {
        const transaction = db.transaction("files", "readwrite");
        for (const record of records) transaction.objectStore("files").put(record);
        transaction.oncomplete = resolve;
        transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error("Unable to store proof files"));
      });
      return records.map(({ blob, ...metadata }) => metadata);
    },
    async get(id) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db.transaction("files").objectStore("files").get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    async remove(ids) {
      const db = await open();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction("files", "readwrite");
        for (const id of ids) transaction.objectStore("files").delete(id);
        transaction.oncomplete = resolve;
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
      });
    }
  };
})();
