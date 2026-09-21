// Secrets are set with `wrangler secret put` and are not part of wrangler.jsonc,
// so `wrangler types` (see the cf-typegen script) does not emit them. Declare them
// here so they merge into the generated CloudflareBindings interface.
interface CloudflareBindings {
  ROOT_USERNAME?: string
  ROOT_PASSWORD?: string
  RESEND_API_KEY?: string
}
