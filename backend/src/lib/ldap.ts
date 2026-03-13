import { Client } from "ldapts";

export interface LdapUserInfo {
  username: string;
  displayName: string;
  email: string;
}

function getClient(): Client {
  const url = process.env.LDAP_URL;
  if (!url) throw new Error("LDAP_URL env var is not set");
  return new Client({ url, connectTimeout: 5000 });
}

/**
 * Authenticates a user against Active Directory.
 * Returns basic profile info on success, throws on failure.
 *
 * Flow:
 *  1. Bind with service account to search for the user DN
 *  2. Re-bind with the user's own credentials to verify password
 */
export async function ldapAuthenticate(
  username: string,
  password: string
): Promise<LdapUserInfo> {
  const baseDn = process.env.LDAP_BASE_DN;
  const bindDn = process.env.LDAP_BIND_DN;
  const bindPassword = process.env.LDAP_BIND_PASSWORD;

  if (!baseDn || !bindDn || !bindPassword) {
    throw new Error("LDAP env vars (BASE_DN, BIND_DN, BIND_PASSWORD) are not set");
  }

  const client = getClient();

  try {
    // Step 1: bind with service account to find the user entry
    await client.bind(bindDn, bindPassword);

    const { searchEntries } = await client.search(baseDn, {
      scope: "sub",
      filter: `(sAMAccountName=${escapeLdap(username)})`,
      attributes: ["dn", "displayName", "mail", "sAMAccountName"],
      sizeLimit: 1,
    });

    if (searchEntries.length === 0) {
      throw new Error("User not found in directory");
    }

    const entry = searchEntries[0];
    const userDn = entry.dn;

    // Step 2: re-bind as the user to verify their password
    await client.bind(userDn, password);

    return {
      username: String(entry["sAMAccountName"] ?? username),
      displayName: String(entry["displayName"] ?? username),
      email: String(entry["mail"] ?? ""),
    };
  } finally {
    await client.unbind();
  }
}

/** Escapes special characters in LDAP filter values (RFC 4515). */
function escapeLdap(value: string): string {
  return value.replace(/[\\*()\x00/]/g, (char) => {
    return "\\" + char.charCodeAt(0).toString(16).padStart(2, "0");
  });
}
