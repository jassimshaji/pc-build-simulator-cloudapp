import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const limit = rateLimit("register", clientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(apiError("Too many sign-up attempts. Try again later."), {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(apiError("An account with that email already exists."), {
      status: 409,
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  return NextResponse.json(apiSuccess({ id: user.id, email: user.email }), { status: 201 });
}
