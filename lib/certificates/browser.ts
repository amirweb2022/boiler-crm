import { existsSync } from "node:fs";
import puppeteer from "puppeteer";

export function launchCertificateBrowser() {
  // Prefer Puppeteer's versioned browser. Workstations may already have Chrome
  // installed even when downloading the managed browser is unavailable.
  return existsSync(puppeteer.executablePath())
    ? puppeteer.launch({ headless: true })
    : puppeteer.launch({ headless: true, channel: "chrome" });
}
