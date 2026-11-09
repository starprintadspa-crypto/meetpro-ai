import { prisma } from "../database/prisma";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserWithPassword extends PublicUser {
  passwordHash: string;
}

function toPublic(row: { id: string; email: string; name: string; createdAt: Date }): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const row = await prisma.user.findUnique({ where: { email } });
  return row ? { ...toPublic(row), passwordHash: row.passwordHash } : null;
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? toPublic(row) : null;
}

// Duplicate email par error code "EMAIL_TAKEN" (Prisma unique constraint P2002)
export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<PublicUser> {
  try {
    const row = await prisma.user.create({ data: input });
    return toPublic(row);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      throw Object.assign(new Error("EMAIL_TAKEN"), { code: "EMAIL_TAKEN" });
    }
    throw error;
  }
}
