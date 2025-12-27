const express = require("express");
const puppeteer = require("puppeteer");

const https = require("https");
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

  const PORT = options.PORT || 443;

  // TODO: Добавьте пути к вашим сертификатам
  const certOptions = options.certOptions || {
    key: fs.readFileSync("/your-key-path/privkey.pem"),
    cert: fs.readFileSync("/your-cert-path/fullchain.pem"),
  };

  const server = https.createServer(certOptions, app);

  server.listen(PORT);

  return { app, server };
}

module.exports = { start };
