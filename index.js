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

  const targetURL =
    rawQuery.url || rawQuery.url || rawQuery.URL || req.query.URL;

  if (!targetURL) {
    res.type("text");
    return res.status(400).send("URL is required");
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    // set a reasonable timeout for navigation
    await page.goto(targetURL, { waitUntil: "networkidle2", timeout: 15000 });

    // Wait for button #bt to be available and clickable
    await page.waitForSelector("#bt", { visible: true, timeout: 5000 });
    await page.click("#bt");

    // Wait for input #inp to have a non-empty value
    await page.waitForSelector("#inp", { visible: true, timeout: 5000 });
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#inp");
        return el && el.value && el.value.trim().length > 0;
      },
      { timeout: 5000 }
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
    } catch (e) {
      // ignore
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
