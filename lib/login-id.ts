const USERNAME_DOMAIN = "@accounts.wowo.invalid";

export function loginIdentity(input: string) {
  const id = input.trim().toLowerCase();
  if (id.includes("@") && !id.endsWith(USERNAME_DOMAIN)) return { email: id, name: id.split("@")[0] };
  if (!/^[a-z0-9][a-z0-9_-]{2,19}$/.test(id)) return null;
  return { email: id + USERNAME_DOMAIN, name: id };
}

export function accountLabel(email?: string | null) {
  return email?.endsWith(USERNAME_DOMAIN) ? email.slice(0, -USERNAME_DOMAIN.length) : email;
}
