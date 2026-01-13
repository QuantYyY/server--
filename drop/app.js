import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pug from "pug";
import puppeteer from "puppeteer";
const app = express();
app.use(bodyParser.json());
app.use(cors());

const LOGIN = "ab68baf0-1fd0-4fb0-b364-9f85cf2570ed";

app.get("/login/", (req, res) => {
  res.type("text/plain").send(LOGIN);
});

// /render route
app.post("/render", async (req, res) => {
  try {
    const { random2, random3 } = req.body;
    const addr = req.query.addr;
    if (!addr) {
      return res.status(400).send("addr query parameter is required");
    }
    const response = await fetch(addr);
    const template = await response.text();
    const compiled = pug.compile(template);
    const html = compiled({ random2, random3 });
    res.send(html);
  } catch (err) {
    console.error("Render error:", err);
    res.status(500).send("Render error");
  }
});

app.get("/test/", async (req, res) => {
  const url = req.query.URL;
  if (!url) return res.status(400).send("URL query parameter required");

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    // Click the button with id="bt"
    await page.click("#bt");

    // Wait a moment for the value to update
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Read the value from input#inp
    const value = await page.$eval("#inp", (el) => el.value);

    await browser.close();

    res.type("text/plain").send(value);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server listening on", PORT));
