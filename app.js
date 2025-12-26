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

  async function fetchUrlData(url) {
    return new Promise((resolve, reject) => {
      http
        .get(url, async (response) => {
          try {
            const chunks = [];
            response.on("data", (c) => chunks.push(c));
            response.on("end", () =>
              resolve(Buffer.concat(chunks).toString("utf8"))
            );
            response.on("error", (e) => reject(e));
          } catch (err) {
            reject(err);
          }
        })
        .on("error", reject);
    });
  }

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(corsMiddleware);

  app.get("/login/", (_req, res) => {
    res.set(TEXT_PLAIN_HEADER).send(SYSTEM_LOGIN);
  });

  app.get("/code/", async (_req, res) => {
    const filePath = import.meta.url.substring(7);
    const fileContent = await readFileAsync(filePath);
    res.set(TEXT_PLAIN_HEADER).send(fileContent);
  });

  app.get("/sha1/:input/", (req, res) => {
    const hash = generateSha1Hash(req.params.input);
    res.set(TEXT_PLAIN_HEADER).send(hash);
  });

  app.get("/req/", async (req, res) => {
    try {
      const data = await fetchUrlData(req.query.addr);
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
        if (s.trim().startsWith("{")) {
          try {
            body = JSON.parse(s);
          } catch (e) {
            body = Object.fromEntries(new URLSearchParams(s));
          }
        } else {
          body = Object.fromEntries(new URLSearchParams(s));
        }
      } catch (e) {
        body = {};
      }
    }
    const login = body.login;
    const password = body.password;
    const url = body.URL || body.url;
    if (!login || !password || !url) {
      return res.status(400).send("missing fields");
    }
    try {
      const mongoModule = await import("mongodb");
      const MongoClient =
        mongoModule.MongoClient ||
        (mongoModule.default && mongoModule.default.MongoClient) ||
        mongoModule.default;
      if (!MongoClient)
        throw new Error("MongoClient not found in mongodb module");
      const client = new MongoClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      await client.connect();
      let db;
      try {
        db = client.db();
      } catch (e) {
        // fallback: try to parse db name from url
        const m = url.match(/\/([^/?]+)(?:\?|$)/);
        const dbName = m ? m[1] : undefined;
        db = dbName ? client.db(dbName) : client.db();
      }
      const col = db.collection("users");
      await col.insertOne({ login: String(login), password: String(password) });
      await client.close();
      res.set(TEXT_PLAIN_HEADER).send("ok");
    } catch (err) {
      res.status(500).send(err.toString());
    }
  });

  app.all(/.*/, (_req, res) => {
    res.set(TEXT_PLAIN_HEADER).send(SYSTEM_LOGIN);
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

  return app;
}
