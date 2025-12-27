import express from "express";
const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

app.get("/login/", (_, res) => {
  res.send("ab68baf0-1fd0-4fb0-b364-9f85cf2570ed");
});

app.get("/test/", async (req, res) => {
  const targetURL = req.query.URL;
  if (!targetURL) return res.status(400).send("missing URL");
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    const page = await browser.newPage();
    await page.goto(targetURL, { waitUntil: "networkidle2", timeout: 15000 });
    await page.waitForSelector("#bt", { timeout: 5000 });
    await page.click("#bt");
    await page.waitForSelector("#inp", { timeout: 5000 });
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#inp");
        return !!el && el.value !== undefined;
      },
      { timeout: 5000 }
    );
    const result = await page.$eval(
      "#inp",
      (el) => el.value || el.textContent || el.innerText || ""
    );
    await browser.close();
    res.send(String(result));
  } catch (err) {
    res.status(500).send(String(err));
  }
});

const PORT = process.env.PORT || 10001;
app.listen(PORT);
