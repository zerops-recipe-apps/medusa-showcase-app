import { createUsersWorkflow } from "@medusajs/medusa/core-flows"
import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Idempotent admin bootstrap. `medusa user` + "already exists" is not:
 * a first run can create the User row and then fail before emailpass is
 * linked, after which execOnce treats the retry as success and login stays
 * broken. This script always (re)binds emailpass to SUPERADMIN_PASSWORD.
 */
export default async function createSuperadmin({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const email = process.env.SUPERADMIN_EMAIL?.trim()
  const password = process.env.SUPERADMIN_PASSWORD?.trim()

  if (!email || !password) {
    throw new Error(
      "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set (medusa service secrets)."
    )
  }

  const userModule = container.resolve(Modules.USER)
  const authService = container.resolve(Modules.AUTH)

  let [user] = await userModule.listUsers({ email })

  if (!user) {
    const { result } = await createUsersWorkflow(container).run({
      input: {
        users: [{ email }],
      },
    })
    user = result[0]
    logger.info(`Created admin user ${email}`)
  } else {
    logger.info(`Admin user ${email} already exists`)
  }

  const { success, authIdentity, error } = await authService.register(
    "emailpass",
    {
      body: { email, password },
    }
  )

  let identityId = authIdentity?.id

  if (!success || !identityId) {
    logger.info(
      `emailpass register skipped (${error || "already exists"}); updating password`
    )
    const updated = await authService.updateProvider("emailpass", {
      email,
      password,
      entity_id: user.id,
    })
    identityId = updated.authIdentity?.id
    if (!identityId) {
      throw new Error(
        `Could not register or update emailpass for ${email}: ${
          updated.error || error || "unknown error"
        }`
      )
    }
  }

  await authService.updateAuthIdentities({
    id: identityId,
    app_metadata: {
      user_id: user.id,
    },
  })

  logger.info(`Admin emailpass is linked for ${email}`)
}
