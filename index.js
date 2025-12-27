const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// 5.1 login
app.get(["/login", "/login/"], (_, res) => {
  res.type("text");
  res.send("ab68baf0-1fd0-4fb0-b364-9f85cf2570ed");
});

// /test?URL=... : open page, click #bt, read #inp.value and return it as plain text
app.get(["/test", "/test/"], async (req, res) => {
  const url = req.query.URL || req.query.url;
  if (!url) {
    res.type("text");
    return res.status(400).send("URL is required");
  }

  if (!/^https?:\/\//i.test(url)) {
    res.type("text");
    return res.status(400).send("URL must start with http:// or https://");
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    await page.waitForSelector("#bt", { visible: true, timeout: 10000 });
    await page.click("#bt");

    await page.waitForSelector("#inp", { visible: true, timeout: 10000 });
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#inp");
        return el && el.value && el.value.trim().length > 0;
      },
      { timeout: 10000 }
    );

    const result = await page.$eval("#inp", (el) => el.value);

    res.type("text");
    res.send(String(result));
  } catch (err) {
    console.error("/test error:", err && err.message ? err.message : err);
    res.type("text");
    res.status(500).send("Error");
  } finally {
    try {
      if (browser) await browser.close();
    } catch (_) {}
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
