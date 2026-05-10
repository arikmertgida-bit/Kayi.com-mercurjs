// Dev-mode shim: 'medusa develop' loads source .ts files via CJS require but
// cannot remap .js → .ts for relative imports when using SWC.
// This shim is only used in development; production runs from .medusa/server
// where tsc has already compiled minio-client.ts → minio-client.js.
// ts-node is registered so require('.ts') works here.
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = require("./minio-client.ts")
