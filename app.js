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

  app.post("/req/", async (req, res) => {
    try {
      const data = await fetchUrlData(req.body.addr);
      res.set(TEXT_PLAIN_HEADER).send(data);
    } catch (err) {
      res.status(500).send(err.toString());
    }
  });

  app.all(/.*/, (_req, res) => {
    res.set(TEXT_PLAIN_HEADER).send(SYSTEM_LOGIN);
  });

  return app;
}
