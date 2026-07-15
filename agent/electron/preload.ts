import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("agent", {
  info: () => ipcRenderer.invoke("agent:info"),
  start: (opts: { dryRun?: boolean; limit?: number }) => ipcRenderer.invoke("scan:start", opts),
  cancel: () => ipcRenderer.invoke("scan:cancel"),
  onEvent: (cb: (data: Record<string, unknown>) => void) => {
    ipcRenderer.on("scan:event", (_event, data) => cb(data));
  },
  // Used only by the automated UI test hook in main.ts.
  testDone: () => ipcRenderer.send("test:done"),
});
