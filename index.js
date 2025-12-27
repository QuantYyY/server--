const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// Return the student's login as plain text. Accepts both /login and /login/.
app.get(["/login", "/login/"], (_, res) => {
  res.type("text");
  res.send("ab68baf0-1fd0-4fb0-b364-9f85cf2570ed");
});

// /test?URL=...  - navigates to the provided URL, clicks #bt and reads #inp.value
app.get(["/test", "/test/"], async (req, res) => {
  // Support both URL and url query param keys (case-insensitive)
  const rawQuery = Object.keys(req.query).reduce((acc, k) => {
    acc[k.toLowerCase()] = req.query[k];
    return acc;
  }, {});

  let targetURL =
    rawQuery.url || rawQuery["url"] || req.query.URL || req.query.url;

  // strip surrounding quotes/apostrophes if user accidentally included them
  if (typeof targetURL === "string") {
    targetURL = targetURL.trim().replace(/^'+|'+$|^"+|"+$/g, "");
    try {
      // try decoding if it was urlencoded
      targetURL = decodeURIComponent(targetURL);
    } catch (e) {
      // ignore decode errors and keep raw value
    }
  }

  if (!targetURL) {
    res.type("text");
    return res.status(400).send("URL is required");
  }

  // basic validation: must be http or https
  if (!/^https?:\/\//i.test(targetURL)) {
    res.type("text");
    return res.status(400).send("URL must start with http:// or https://");
  }

  let browser;
  let page;
  try {
    console.log(`/test: resolved targetURL='${targetURL}'`);
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        // avoid /dev/shm issues on some containers
        "--disable-dev-shm-usage",
      ],
    });

    console.log(`/test: navigating to ${targetURL}`);

    page = await browser.newPage();
    // more generous timeouts for slower pages
    const NAV_TIMEOUT = 30000;
    const SELECTOR_TIMEOUT = 10000;
    const VALUE_TIMEOUT = 10000;

    // navigate
    await page.goto(targetURL, {
      waitUntil: "networkidle2",
      timeout: NAV_TIMEOUT,
    });

    // Wait for button #bt to be available and clickable
    await page.waitForSelector("#bt", {
      visible: true,
      timeout: SELECTOR_TIMEOUT,
    });
    await page.click("#bt");

    // Wait for input #inp to have a non-empty value
    await page.waitForSelector("#inp", {
      visible: true,
      timeout: SELECTOR_TIMEOUT,
    });
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#inp");
        return el && el.value && el.value.trim().length > 0;
      },
      { timeout: VALUE_TIMEOUT }
    );

    const result = await page.$eval("#inp", (el) => el.value);

    res.type("text");
    res.send(String(result));
  } catch (err) {
    // build a helpful error message
    let msg = err && err.message ? `Error: ${err.message}` : "Error";
    // detect timeout errors
    if (err && err.name === "TimeoutError") {
      msg = `TimeoutError: ${err.message}`;
    }
    console.error("/test error:", err);

    // try to capture a small snapshot of page HTML to help debugging (if available)
    try {
      if (page) {
        const html = await page.content();
        console.error(
          "/test: page snapshot (first 2000 chars):\n",
          html.substring(0, 2000)
        );
      }
    } catch (snapErr) {
      console.error(
        "/test: could not capture page snapshot:",
        snapErr && snapErr.message ? snapErr.message : snapErr
      );
    }

    res.type("text");
    res.status(500).send(msg);
  } finally {
    try {
      if (browser) await browser.close();
    } catch (e) {
      // ignore
    }
  }
});

// simple healthcheck
app.get(["/health", "/healthz"], (_, res) => {
  res.type("text");
  res.send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
