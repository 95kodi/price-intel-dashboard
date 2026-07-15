/**
 * Electron main process for the Price Intel scraper agent UI.
 * The scan itself runs in this process (Node) using the shared scan module.
 */
import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { loadConfig, runScan, ScanOptions } from "../src/scan";

// Portable exe: config lives next to the exe, not in the extraction temp dir.
function configDir(): string {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  if (app.isPackaged) return path.dirname(process.execPath);
  return process.cwd();
}

let win: BrowserWindow | null = null;
let scanRunning = false;
let cancelRequested = false;

function send(channel: string, payload: unknown) {
  win?.webContents.send(channel, payload);
}

function createWindow() {
  win = new BrowserWindow({
    width: 520,
    height: 700,
    minWidth: 420,
    minHeight: 520,
    autoHideMenuBar: true,
    title: "Price Intel Agent",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "..", "ui", "index.html"));
  win.on("closed", () => (win = null));
}

ipcMain.handle("scan:start", async (_event, opts: ScanOptions) => {
  if (scanRunning) return { ok: false, error: "A scan is already running" };
  if (process.env.AGENT_UI_TEST_LIMIT) opts = { ...opts, limit: Number(process.env.AGENT_UI_TEST_LIMIT) };
  scanRunning = true;
  cancelRequested = false;

  const config = loadConfig(configDir());
  send("scan:event", { type: "started", apiBase: config.apiBase, dryRun: !!opts.dryRun });

  try {
    const totals = await runScan(
      config,
      opts,
      {
        onStart: (total) => send("scan:event", { type: "products", total }),
        onProduct: (index, total, name) =>
          send("scan:event", { type: "product", index, total, name }),
        onPlatform: (product, platform) =>
          send("scan:event", { type: "platform", product, platform }),
        onResult: (result) => send("scan:event", { type: "result", ...result }),
      },
      () => cancelRequested
    );
    send("scan:event", { type: "done", cancelled: cancelRequested, ...totals });
    return { ok: true };
  } catch (err) {
    send("scan:event", { type: "error", message: (err as Error).message });
    return { ok: false, error: (err as Error).message };
  } finally {
    scanRunning = false;
  }
});

ipcMain.handle("scan:cancel", () => {
  cancelRequested = true;
  return { ok: true };
});

ipcMain.handle("agent:info", () => {
  const config = loadConfig(configDir());
  return { apiBase: config.apiBase, version: app.getVersion() };
});

app.whenReady().then(() => {
  createWindow();

  // Automated UI test hook: AGENT_UI_TEST=idle|scan captures a screenshot
  // to AGENT_UI_SHOT (or ui-test.png in cwd) and exits.
  const testMode = process.env.AGENT_UI_TEST;
  if (testMode) {
    const shotPath = process.env.AGENT_UI_SHOT || path.join(process.cwd(), "ui-test.png");
    const capture = async () => {
      if (!win) return app.quit();
      const image = await win.webContents.capturePage();
      const fs = await import("fs");
      fs.writeFileSync(shotPath, image.toPNG());
      app.quit();
    };
    if (testMode === "scan") {
      win?.webContents.once("did-finish-load", () => {
        win?.webContents.executeJavaScript(
          "document.getElementById('dry-run').checked = true; document.getElementById('start-btn').click();"
        );
      });
      ipcMain.on("test:done", () => void setTimeout(capture, 500));
    } else {
      setTimeout(() => void capture(), 3000);
    }
  }
});

app.on("window-all-closed", () => app.quit());
