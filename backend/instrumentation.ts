// Uncomment this file to enable instrumentation and observability using OpenTelemetry
// Refer to the docs for installation instructions: https://docs.medusajs.com/learn/debugging-and-testing/instrumentation

// import { registerOtel } from "@medusajs/medusa"
// // If using an exporter other than Zipkin, require it here.
// import { ZipkinExporter } from "@opentelemetry/exporter-zipkin"

// // If using an exporter other than Zipkin, initialize it here.
// const exporter = new ZipkinExporter({
//   serviceName: 'my-medusa-project',
// })

/**
 * Dev-mode shim: 'medusa develop' loads source .ts files via CJS require(),
 * but Node16 moduleResolution requires .js extensions in import paths.
 * Since only .ts source files exist (not .js), relative imports like
 * '../lib/foo.js' fail. This hook retries with .ts when .js is not found.
 *
 * In production the built .medusa/server output has compiled .js files,
 * so this fallback is never triggered.
 */
export function register() {
  type ModuleResolver = {
    _resolveFilename(
      request: string,
      parent: unknown,
      isMain: boolean,
      options: unknown
    ): string
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const NodeModule = require("module") as ModuleResolver
  const original = NodeModule._resolveFilename.bind(NodeModule)

  NodeModule._resolveFilename = function (
    request: string,
    parent: unknown,
    isMain: boolean,
    options: unknown
  ): string {
    try {
      return original(request, parent, isMain, options)
    } catch (e) {
      if (
        typeof e === "object" &&
        e !== null &&
        (e as { code?: string }).code === "MODULE_NOT_FOUND" &&
        request.endsWith(".js")
      ) {
        try {
          return original(
            request.slice(0, -3) + ".ts",
            parent,
            isMain,
            options
          )
        } catch {
          // fall through to original error
        }
      }
      throw e
    }
  }
}