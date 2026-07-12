import {
  PLATFORM_ROLES,
  isPlatformRole,
  resolvePrimaryRole,
} from "../auth/rbac";

type KeycloakTokenResponse = {
  access_token: string;
  expires_in?: number;
};

type KeycloakRole = {
  id: string;
  name: string;
  description?: string;
  composite?: boolean;
  clientRole?: boolean;
  containerId?: string;
};

type KeycloakUser = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled?: boolean;
  createdTimestamp?: number;
};

export type KeycloakUserDto = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: "active" | "disabled";
  createdAt: string;
};

export type CreateKeycloakUserInput = {
  username: string;
  fullName: string;
  email: string;
  role: string;
  password?: string;
};

export type UpdateKeycloakUserInput = {
  fullName?: string;
  email?: string;
  role?: string;
  password?: string;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getIssuer() {
  return process.env.KEYCLOAK_ISSUER_URL?.replace(/\/+$/, "");
}

function getRealm() {
  if (process.env.KEYCLOAK_REALM) return process.env.KEYCLOAK_REALM;

  const issuer = getIssuer();
  if (!issuer) return "data-team";

  const marker = "/realms/";
  const index = issuer.indexOf(marker);
  return index >= 0 ? issuer.slice(index + marker.length) : "data-team";
}

function getAdminBaseUrl() {
  if (process.env.KEYCLOAK_ADMIN_BASE_URL) {
    return trimTrailingSlash(process.env.KEYCLOAK_ADMIN_BASE_URL);
  }

  const issuer = getIssuer();
  if (!issuer) return null;

  const url = new URL(issuer);
  const index = url.pathname.indexOf("/realms/");
  url.pathname = index >= 0 ? url.pathname.slice(0, index) : "";
  return trimTrailingSlash(url.toString());
}

function getAdminTokenRealm() {
  return process.env.KEYCLOAK_ADMIN_REALM || getRealm();
}

export function isKeycloakAdminConfigured() {
  const baseUrl = getAdminBaseUrl();
  const hasClientCredentials = Boolean(
    process.env.KEYCLOAK_ADMIN_CLIENT_ID &&
      process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
  );
  const hasPasswordGrant = Boolean(
    process.env.KEYCLOAK_ADMIN_USERNAME &&
      process.env.KEYCLOAK_ADMIN_PASSWORD,
  );
  return Boolean(baseUrl && (hasClientCredentials || hasPasswordGrant));
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function getAdminToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const baseUrl = getAdminBaseUrl();
  if (!baseUrl) throw new Error("KEYCLOAK_ADMIN_BASE_URL is not configured");

  const body = new URLSearchParams();
  if (process.env.KEYCLOAK_ADMIN_CLIENT_SECRET) {
    body.set("grant_type", "client_credentials");
    body.set("client_id", process.env.KEYCLOAK_ADMIN_CLIENT_ID || "");
    body.set("client_secret", process.env.KEYCLOAK_ADMIN_CLIENT_SECRET);
  } else {
    body.set("grant_type", "password");
    body.set("client_id", process.env.KEYCLOAK_ADMIN_CLIENT_ID || "admin-cli");
    body.set("username", process.env.KEYCLOAK_ADMIN_USERNAME || "");
    body.set("password", process.env.KEYCLOAK_ADMIN_PASSWORD || "");
  }

  const response = await fetch(
    `${baseUrl}/realms/${encodeURIComponent(getAdminTokenRealm())}/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!response.ok) {
    throw new Error(`Keycloak token request failed: ${response.status}`);
  }

  const token = await parseResponse<KeycloakTokenResponse>(response);
  cachedToken = {
    token: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 60) * 1000,
  };
  return cachedToken.token;
}

async function adminFetch<T>(path: string, init: RequestInit = {}) {
  const baseUrl = getAdminBaseUrl();
  if (!baseUrl) throw new Error("KEYCLOAK_ADMIN_BASE_URL is not configured");

  const token = await getAdminToken();
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(
    `${baseUrl}/admin/realms/${encodeURIComponent(getRealm())}${path}`,
    { ...init, headers },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Keycloak admin request failed: ${response.status} ${message}`,
    );
  }

  return parseResponse<T>(response);
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || fullName.trim(), lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function mapUser(user: KeycloakUser, roles: KeycloakRole[]): KeycloakUserDto {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const roleNames = roles.map((role) => role.name).filter(isPlatformRole);

  return {
    id: user.id,
    username: user.username || user.email || user.id,
    fullName: fullName || user.username || user.email || user.id,
    email: user.email || "",
    role: resolvePrimaryRole(roleNames),
    status: user.enabled === false ? "disabled" : "active",
    createdAt: user.createdTimestamp
      ? new Date(user.createdTimestamp).toISOString()
      : new Date(0).toISOString(),
  };
}

async function getUserRealmRoles(userId: string) {
  return adminFetch<KeycloakRole[]>(
    `/users/${encodeURIComponent(userId)}/role-mappings/realm`,
  );
}

async function getRealmRole(roleName: string) {
  return adminFetch<KeycloakRole>(`/roles/${encodeURIComponent(roleName)}`);
}

async function setUserPlatformRole(userId: string, roleName: string) {
  if (!isPlatformRole(roleName)) {
    return;
  }

  const currentRoles = await getUserRealmRoles(userId);
  const currentPlatformRoles = currentRoles.filter((role) =>
    isPlatformRole(role.name),
  );

  if (currentPlatformRoles.length) {
    await adminFetch<void>(
      `/users/${encodeURIComponent(userId)}/role-mappings/realm`,
      {
        method: "DELETE",
        body: JSON.stringify(currentPlatformRoles),
      },
    );
  }

  const targetRole = await getRealmRole(roleName);
  await adminFetch<void>(
    `/users/${encodeURIComponent(userId)}/role-mappings/realm`,
    {
      method: "POST",
      body: JSON.stringify([targetRole]),
    },
  );
}

async function findUserByUsername(username: string) {
  const users = await adminFetch<KeycloakUser[]>(
    `/users?username=${encodeURIComponent(username)}&exact=true`,
  );
  return users[0] ?? null;
}

async function listUsers() {
  const users = await adminFetch<KeycloakUser[]>(
    "/users?briefRepresentation=false&max=500",
  );
  return Promise.all(
    users.map(async (user) => mapUser(user, await getUserRealmRoles(user.id))),
  );
}

async function getUser(id: string) {
  const user = await adminFetch<KeycloakUser>(`/users/${encodeURIComponent(id)}`);
  return mapUser(user, await getUserRealmRoles(id));
}

async function createUser(input: CreateKeycloakUserInput) {
  const { firstName, lastName } = splitFullName(input.fullName);
  const credentials = input.password
    ? [{ type: "password", value: input.password, temporary: false }]
    : undefined;

  await adminFetch<void>("/users", {
    method: "POST",
    body: JSON.stringify({
      username: input.username,
      firstName,
      lastName,
      email: input.email,
      enabled: true,
      emailVerified: true,
      credentials,
    }),
  });

  const created = await findUserByUsername(input.username);
  if (!created) throw new Error("Created Keycloak user was not found");

  await setUserPlatformRole(created.id, input.role);
  return getUser(created.id);
}

async function updateUser(id: string, input: UpdateKeycloakUserInput) {
  const existing = await adminFetch<KeycloakUser>(`/users/${encodeURIComponent(id)}`);
  const name = input.fullName ? splitFullName(input.fullName) : {};

  await adminFetch<void>(`/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      ...existing,
      ...name,
      ...(input.email != null ? { email: input.email } : {}),
    }),
  });

  if (input.password) {
    await adminFetch<void>(`/users/${encodeURIComponent(id)}/reset-password`, {
      method: "PUT",
      body: JSON.stringify({
        type: "password",
        value: input.password,
        temporary: false,
      }),
    });
  }

  if (input.role) {
    await setUserPlatformRole(id, input.role);
  }

  return getUser(id);
}

async function setUserEnabled(id: string, enabled: boolean) {
  const existing = await adminFetch<KeycloakUser>(`/users/${encodeURIComponent(id)}`);
  await adminFetch<void>(`/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ ...existing, enabled }),
  });
  return getUser(id);
}

async function deleteUser(id: string) {
  await adminFetch<void>(`/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export const keycloakAdminService = {
  platformRoles: PLATFORM_ROLES,
  listUsers,
  getUser,
  createUser,
  updateUser,
  setUserEnabled,
  deleteUser,
};
