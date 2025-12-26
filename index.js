// index.js - CommonJS entrypoint that starts the HTTP server
const express = require("express");
const bodyParser = require("body-parser");
const { createReadStream } = require("fs");
const path = require("path");

// Require the app factory exported from server.js
const { createApp } = require("./server.js");

const currentFilePath = path.join(__dirname, "server.js");
const app = createApp(express, bodyParser, createReadStream, currentFilePath);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // Friendly startup log; Render and other platforms use PORT env var
  // so this will confirm the server started there as well.
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
