import "server-only";

import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export type FirebaseTokenClaims = JWTPayload & {
  email?: string;
  email_verified?: boolean;
  user_id?: string;
};

export type Verifier = (token: string) => Promise<FirebaseTokenClaims>;

export type CreateVerifierOptions = {
  jwksUrl?: string;
  projectId: string;
  clockTolerance?: number;
};

export function createVerifier(options: CreateVerifierOptions): Verifier {
  const { jwksUrl = FIREBASE_JWKS_URL, projectId, clockTolerance = 30 } = options;
  if (!projectId) {
    throw new Error("createVerifier requires a non-empty projectId.");
  }

  const jwks = createRemoteJWKSet(new URL(jwksUrl));

  return async (token: string) => {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
      clockTolerance,
    });
    return payload as FirebaseTokenClaims;
  };
}

let defaultVerifierCache: Verifier | null = null;

export function getDefaultVerifier(): Verifier {
  if (defaultVerifierCache) return defaultVerifierCache;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID is not configured. Required to verify Firebase ID tokens."
    );
  }
  defaultVerifierCache = createVerifier({ projectId });
  return defaultVerifierCache;
}
