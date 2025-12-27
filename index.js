const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

app.get("/login", (_, res) => {
  res.send("ab68baf0-1fd0-4fb0-b364-9f85cf2570ed");
});

app.get("/test", async (req, res) => {
  try {
    const targetURL = req.query.URL;
    if (!targetURL) {
      return res.status(400).send("URL is required");
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(targetURL, { waitUntil: "networkidle2" });

    await page.click("#bt");

    await page.waitForFunction(
      () => {
        const input = document.querySelector("#inp");
        return input && input.value;
      },
      { timeout: 3000 }
    );

    const result = await page.evaluate(() => {
      return document.querySelector("#inp").value;
    });

    await browser.close();

    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
