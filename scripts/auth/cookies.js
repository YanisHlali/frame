const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "..", "..", "cookies.json");
const outputPath = path.join(__dirname, "..", "..", "cookies.b64");

try {
  const jsonRaw = fs.readFileSync(jsonPath, { encoding: "utf-8" });

  const formattedJson = JSON.stringify(JSON.parse(jsonRaw), null, 2);

  const base64 = Buffer.from(formattedJson, "utf-8").toString("base64");

  fs.writeFileSync(outputPath, base64);

  console.log("cookies.b64 created successfully!");
} catch (err) {
  console.error("Error during conversion:", err);
}
