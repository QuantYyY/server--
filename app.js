export default function createApp(
  express,
  bodyParser,
  createReadStream,
  crypto,
  http
) {
  const app = express();

  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS,DELETE",
    "Access-Control-Allow-Headers": "*",
  };
  const TEXT_PLAIN_HEADER = { "Content-Type": "text/plain; charset=utf-8" };
  const SYSTEM_LOGIN = "ab68baf0-1fd0-4fb0-b364-9f85cf2570ed";

  function corsMiddleware(req, res, next) {
    res.set(CORS_HEADERS);
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  }

  async function fetchUrlData(url) {
    return new Promise(async (resolve, reject) => {
      try {
        const parsed = new URL(url);
        const mod =
          parsed.protocol === "https:"
            ? await import("https")
            : await import("http");
        const get = mod.get || (mod.default && mod.default.get) || mod.default;
        get(url, (response) => {
          const chunks = [];
          response.on("data", (c) => chunks.push(c));
          response.on("end", () =>
            resolve(Buffer.concat(chunks).toString("utf8"))
          );
          response.on("error", (e) => reject(e));
        }).on("error", reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  function readFileAsync(filePath) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = createReadStream(filePath);
      stream.on("data", (c) => chunks.push(c));
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      stream.on("error", (e) => reject(e));
    });
  }

  function generateSha1Hash(text) {
    return crypto.createHash("sha1").update(text).digest("hex");
  }

  // minimal global middleware
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(corsMiddleware);

  app.get("/login/", (_req, res) =>
    res.set(TEXT_PLAIN_HEADER).send(SYSTEM_LOGIN)
  );

  app.get("/code/", async (_req, res) => {
    const filePath = import.meta.url.startsWith("file:")
      ? import.meta.url.substring(7)
      : import.meta.url;
    const content = await readFileAsync(filePath);
    res.set(TEXT_PLAIN_HEADER).send(content);
  });

  app.get("/sha1/:input/", (req, res) =>
    res.set(TEXT_PLAIN_HEADER).send(generateSha1Hash(req.params.input || ""))
  );

  app.get("/wordpress/", (_req, res) => {
    res
      .set({ "Content-Type": "text/html; charset=utf-8" })
      .send(
        `<!doctype html><html><head><meta charset="utf-8"><title>Wordpress</title></head><body><h1>${SYSTEM_LOGIN}</h1><p>Single post with id=1</p></body></html>`
      );
  });

  app.get("/wordpress/wp-json/wp/v2/posts/1", (_req, res) =>
    res
      .set(TEXT_PLAIN_HEADER)
      .send(JSON.stringify({ id: 1, title: { rendered: SYSTEM_LOGIN } }))
  );

  app.get("/testpage/", (_req, res) => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Test</title></head><body><button id="bt">Click</button><input id="inp" value=""/></body><script>document.getElementById('bt').addEventListener('click', ()=>{document.getElementById('inp').value = Math.floor(Math.random()*1000)});</script></html>`;
    res.set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
  });

  app.get("/test/", async (req, res) => {
    const addr = req.query.URL || req.query.url;
    if (!addr) return res.status(400).send("missing URL");
    let browser;
    try {
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
      });
      const page = await browser.newPage();
      await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64)");
      await page.goto(addr, { waitUntil: "networkidle2", timeout: 15000 });
      await page.waitForSelector("#bt", { timeout: 5000 });
      await page.click("#bt");
      await page.waitForSelector("#inp", { timeout: 5000 });
      await page.waitForFunction(
        () => {
          const el = document.querySelector("#inp");
          return (
            !!el &&
            ((el.value && el.value !== "") ||
              (el.textContent && el.textContent !== ""))
          );
        },
        { timeout: 5000 }
      );
      const val = await page.$eval(
        "#inp",
        (el) => el.value || el.textContent || el.innerText || ""
      );
      await browser.close();
      res.set(TEXT_PLAIN_HEADER).send(String(val).trim());
    } catch (err) {
      try {
        if (browser) await browser.close();
      } catch (e) {}
      res.status(500).send(err.toString());
    }
  });

  app.get("/req/", async (req, res) => {
    const addr = req.query.addr || req.query.URL || req.query.url;
    if (!addr) return res.status(400).send("missing URL");
    try {
      const data = await fetchUrlData(addr);
      res.set(TEXT_PLAIN_HEADER).send(data);
    } catch (err) {
      res.status(500).send(err.toString());
    }
  });

  app.post("/req/", async (req, res) => {
    let body = req.body;
    if (!body || Object.keys(body).length === 0) {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const s = Buffer.concat(chunks).toString("utf8");
        body = s.trim().startsWith("{")
          ? JSON.parse(s)
          : Object.fromEntries(new URLSearchParams(s));
      } catch (e) {
        body = {};
      }
    }
    const addr = body.addr || body.URL || body.url || req.query.addr;
    if (!addr) return res.status(400).send("missing URL");
    try {
      const data = await fetchUrlData(addr);
      res.set(TEXT_PLAIN_HEADER).send(data);
    } catch (err) {
      res.status(500).send(err.toString());
    }
  });

  app.post("/insert/", async (req, res) => {
    let body = req.body;
    if (!body || Object.keys(body).length === 0) {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const s = Buffer.concat(chunks).toString("utf8");
        body = s.trim().startsWith("{")
          ? JSON.parse(s)
          : Object.fromEntries(new URLSearchParams(s));
      } catch (e) {
        body = {};
      }
    }
    const login = body.login;
    const password = body.password;
    const url = body.URL || body.url;
    if (!login || !password || !url)
      return res.status(400).send("missing fields");
    try {
      const mongoModule = await import("mongodb");
      const MongoClient =
        mongoModule.MongoClient ||
        (mongoModule.default && mongoModule.default.MongoClient) ||
        mongoModule.default;
      if (!MongoClient) throw new Error("MongoClient not found");
      const client = new MongoClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      await client.connect();
      const db = client.db();
      const col = db.collection("users");
      await col.insertOne({ login: String(login), password: String(password) });
      await client.close();
      res.set(TEXT_PLAIN_HEADER).send("ok");
    } catch (err) {
      res.status(500).send(err.toString());
    }
  });

  app.get("/insert/", async (req, res) => {
    const login = req.query.login;
    const password = req.query.password;
    const url = req.query.URL || req.query.url;
    if (!login || !password || !url)
      return res.status(400).send("missing fields");
    try {
      const mongoModule = await import("mongodb");
      const MongoClient =
        mongoModule.MongoClient ||
        (mongoModule.default && mongoModule.default.MongoClient) ||
        mongoModule.default;
      if (!MongoClient) throw new Error("MongoClient not found");
      const client = new MongoClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      await client.connect();
      const db = client.db();
      const col = db.collection("users");
      await col.insertOne({ login: String(login), password: String(password) });
      await client.close();
      res.set(TEXT_PLAIN_HEADER).send("ok");
    } catch (err) {
      res.status(500).send(err.toString());
    }
  });

  app.get("/template.pug", (_req, res) => {
    const pugTpl = `html
head
  meta(charset="utf-8")
body
  h1= random2
  p= random3`;
    res.set({ "Content-Type": "text/plain; charset=utf-8" }).send(pugTpl);
  });

  app.post("/render/", async (req, res) => {
    let body = req.body;
    if (!body || Object.keys(body).length === 0) {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const s = Buffer.concat(chunks).toString("utf8");
        body = s.trim().startsWith("{")
          ? JSON.parse(s)
          : Object.fromEntries(new URLSearchParams(s));
      } catch (e) {
        body = {};
      }
    }
    const { random2, random3 } = body;
    const addr = req.query.addr;
    if (!addr) return res.status(400).send("missing addr");
    try {
      const tpl = await fetchUrlData(addr);
      const pugMod = await import("pug");
      const pug = pugMod.default || pugMod;
      const fn = pug.compile(tpl);
      const html = fn({ random2, random3 });
      res.set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
    } catch (err) {
      res.status(500).send(err.toString());
    }
  });

  app.all(/.*/, (_req, res) => {
    res.set(TEXT_PLAIN_HEADER).send(SYSTEM_LOGIN);
  });

  return app;
}
