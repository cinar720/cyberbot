export const roles = {
  staff: {
    owner: process.env.STAFF_OWNER_ROLE_ID || '',
    founder: process.env.STAFF_FOUNDER_ROLE_ID || '',
    admin: process.env.STAFF_ADMIN_ROLE_ID || '',
    moderator: process.env.STAFF_MODERATOR_ROLE_ID || '',
    helper: process.env.STAFF_HELPER_ROLE_ID || '',
    trial: process.env.STAFF_TRIAL_ROLE_ID || '',
  },
  system: {
    muted: process.env.MUTED_ROLE_ID || '',
    jail: process.env.JAIL_ROLE_ID || '',
    verified: process.env.VERIFIED_ROLE_ID || '',
    boost: process.env.BOOST_ROLE_ID || '',
    bots: process.env.BOTS_ROLE_ID || '',
  },
  autoRole: process.env.AUTOROLE_ID || '',
} as const;
