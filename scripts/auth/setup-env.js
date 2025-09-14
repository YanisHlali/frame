const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "..", "..", "cookies.json");
const envPath = path.join(__dirname, "..", "..", ".env");

if (!fs.existsSync(jsonPath)) {
  console.error("cookies.json not found!");
  process.exit(1);
}

const jsonRaw = fs.readFileSync(jsonPath, "utf-8");
let formattedJson;
try {
  formattedJson = JSON.stringify(JSON.parse(jsonRaw), null, 2);
} catch (e) {
  console.error("Invalid cookies.json:", e);
  process.exit(1);
}
const base64 = Buffer.from(formattedJson, "utf-8").toString("base64");

let envContent = "";
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, "utf-8");
  if (/^COOKIES_BASE64=.*$/m.test(envContent)) {
    envContent = envContent.replace(/^COOKIES_BASE64=.*$/m, `COOKIES_BASE64=${base64}`);
  } else {
    envContent += `\nCOOKIES_BASE64=${base64}\n`;
  }
} else {
  envContent = `COOKIES_BASE64=${base64}\n`;
}

fs.writeFileSync(envPath, envContent, "utf-8");
console.log("COOKIES_BASE64 updated in .env!");
