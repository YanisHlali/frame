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

cloneDoc(`content/${CONTENT_ID}`, `content/${CONTENT_ID}-test`)
  .then(() => {
    console.log("Cloning completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error during cloning:", err);
    process.exit(1);
  });
