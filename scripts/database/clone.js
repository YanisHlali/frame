require("dotenv/config");
require("tsconfig-paths/register");
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "NodeNext",
    moduleResolution: "NodeNext",
  },
});

const cloneDocModule = require("./cloneDoc.ts");
const cloneDoc = cloneDocModule.cloneDoc || cloneDocModule.default;
const CONTENT_ID = process.env.CONTENT_ID;
const DEST_ID = process.env.DEST_ID || CONTENT_ID;

const baseContentId = CONTENT_ID.endsWith("-test")
  ? CONTENT_ID.slice(0, -5)
  : CONTENT_ID;

const srcPath = `content/${baseContentId}`;
const destPath = `content/${DEST_ID}`;

cloneDoc(srcPath, destPath)
  .then(() => {
    console.log("Cloning completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error during cloning:", err);
    process.exit(1);
  });
