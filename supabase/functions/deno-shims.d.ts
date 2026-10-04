/**
 * NEXUS — ambient declarations that let the Edge Functions be type-checked
 * without a Deno toolchain.
 *
 * The edge functions run on Deno, but the project's only type-check gate is
 * `tsc --noEmit` over `src/`, which never reached `supabase/functions/`. That
 * left all 14 function bodies unchecked: a typo, a wrong argument name or a
 * misused response shape would only surface when the function was invoked —
 * i.e. during the live event. This file closes that gap.
 *
 * It declares exactly the platform surface the functions use (`Deno.serve`,
 * `Deno.env`) and maps the one remote specifier onto the real npm types, so
 * the functions are checked against genuine Supabase client types rather than
 * `any`.
 */

declare namespace Deno {
  /** Registers the fetch handler for the running edge function. */
  function serve(handler: (req: Request) => Response | Promise<Response>): void

  const env: {
    get(key: string): string | undefined
  }
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.0' {
  export * from '@supabase/supabase-js'
}