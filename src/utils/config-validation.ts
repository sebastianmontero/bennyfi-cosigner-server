import { z } from 'zod'
import config from 'config'

const NAME_REGEX = /^[a-z1-5\\.]{1,12}$/
const NAME_VALIDATION = z.string().regex(NAME_REGEX)
const AUTHORIZE_OBJECT_VALIDATION = z.object({
    contract: NAME_VALIDATION,
    actions: z.array(NAME_VALIDATION).min(1),
})

export const configSchema = z.object({
    server: z.object({
        name: z.string(),
        port: z.number(),
    }),
    eosio: z.object({
        apiDefault: z.string().url(),
        apiSampler: z.string().url(),
        chainId: z.string().regex(/^[0-9a-fA-F]{64}$/),
        systemToken: z.string().regex(/^\d{1,2},[A-Z]{2,7}$/),
        maxCpuUsageMs: z.number(),
    }),
    account: z.object({
        name: NAME_VALIDATION,
        permission: NAME_VALIDATION,
        key: z.string(),
    }),
    authorize: z.object({
        bennyfi: AUTHORIZE_OBJECT_VALIDATION,
        xchange: AUTHORIZE_OBJECT_VALIDATION,
        token: AUTHORIZE_OBJECT_VALIDATION,
    }),
    log: z.array(z.object({
        level: z.string(),
        out: z.string(),
    })),
});

export function validateConfig() {
    console.log("Validating config...", JSON.stringify(config.util.toObject(), null, 2));
    const parsedConfig = configSchema.safeParse(config.util.toObject());
    if (!parsedConfig.success) {
      const errors = parsedConfig.error.flatten().fieldErrors;
      console.error("Config validation failed:", JSON.stringify(errors, null, 2));
      process.exit(1); // Exit the app if validation fails
    }
  }
