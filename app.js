const express = require("express");
const puppeteer = require("puppeteer");

const https = require("https");
const http = require("http");
const fs = require("fs");

function start(options = {}) {
  const app = express();

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
  });

  app.get("/login/", (_, res) => {
    // TODO: Добавьте ваш логин
    res.send("your-login");
  });

  app.get("/test/", async (req, res) => {
    const targetURL = req.query.URL;

    // TODO: Заранее установить в систему chromium
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/usr/bin/chromium-browser",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(targetURL, { waitUntil: "networkidle2" });

    await page.click("#bt");

    await page.waitForFunction(
      () => {
        const input = document.querySelector("#inp");
        return input.value;
      },
      { timeout: 1000 }
    );

    const result = await page.evaluate(() => {
      return document.querySelector("#inp").value;
    });

    await browser.close();

    res.send(result);
  });

  const PORT = process.env.PORT || options.PORT || 10000;

  // Puppeteer executable path override (optional)
  const puppeteerExec = process.env.CHROMIUM_PATH || options.executablePath;

  // create a launcher function that uses the resolved executable path
  function launchPuppeteer(launchOpts = {}) {
    const base = Object.assign(
      { headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] },
      launchOpts
    );
    if (puppeteerExec) base.executablePath = puppeteerExec;
    return puppeteer.launch(base);
  }

  // attach launch helper to app locals so handlers can use it
  app.locals.launchPuppeteer = launchPuppeteer;

  // SSL certs: prefer explicit options.certOptions, then env paths; if missing, fall back to HTTP
  let server;
  if (
    options.certOptions &&
    options.certOptions.key &&
    options.certOptions.cert
  ) {
    server = https.createServer(options.certOptions, app);
  } else if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
    const keyPath = process.env.SSL_KEY_PATH;
    const certPath = process.env.SSL_CERT_PATH;
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const certOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      server = https.createServer(certOptions, app);
    }
  }

  if (!server) {
    // fallback to plain HTTP
    server = http.createServer(app);
  }

  server.listen(PORT);

  return { app, server };
}

module.exports = { start };
