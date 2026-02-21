import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface TokenPayload {
  email: string;
  iat?: number;
  exp?: number;
}

export function signToken(email: string): string {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: "90d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
