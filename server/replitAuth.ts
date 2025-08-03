import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request, Response } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// Email whitelist for internal team access only
// PROGENY AGROTECH authorized team members:
const AUTHORIZED_EMAILS: string[] = [
  "progenyagrotech@gmail.com",
  "afiqsyahmifaridun@gmail.com",
];

// Domain whitelist (leave empty since you don't have a company domain)
const AUTHORIZED_DOMAINS: string[] = [];

function isAuthorizedUser(email: string | null): boolean {
  if (!email) {
    console.log("Access denied: No email provided");
    return false;
  }

  // Check if email is in the authorized emails list
  if (AUTHORIZED_EMAILS.includes(email.toLowerCase())) {
    console.log(`Access granted: Email ${email} is in whitelist`);
    return true;
  }

  // Check if email domain is authorized
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (emailDomain && AUTHORIZED_DOMAINS.includes(emailDomain)) {
    console.log(`Access granted: Domain ${emailDomain} is authorized`);
    return true;
  }

  console.log(`Access denied: Email ${email} not authorized`);
  return false;
}

async function upsertUser(
  claims: any,
): Promise<void> {
  const userEmail = claims["email"];
  
  // Security check: Only allow authorized users
  if (!isAuthorizedUser(userEmail)) {
    throw new Error("Access denied: This system is restricted to internal PROGENY AGROTECH team members only.");
  }

  await storage.upsertUser({
    id: claims["sub"],
    email: userEmail,
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (error: any) {
      console.error("Authentication failed:", error.message);
      // Return authentication failure with specific error message
      verified(error, false);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/unauthorized",
    })(req, res, next);
  });

  // Add unauthorized access page route
  app.get("/unauthorized", (req: Request, res: Response) => {
    res.status(403).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Access Denied - PROGENY AGROTECH</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 600px; 
              margin: 100px auto; 
              padding: 20px; 
              text-align: center; 
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #dc3545; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; margin-bottom: 15px; }
            .logo { color: #16a34a; font-weight: bold; font-size: 24px; margin-bottom: 20px; }
            .contact { background: #f8f9fa; padding: 20px; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🌱 PROGENY AGROTECH</div>
            <h1>Access Denied</h1>
            <p>This system is restricted to internal PROGENY AGROTECH team members only.</p>
            <p>If you are a team member and believe this is an error, please contact your system administrator to have your email address added to the authorized users list.</p>
            <div class="contact">
              <strong>For Access Requests:</strong><br>
              Contact your PROGENY AGROTECH system administrator or HR department.
            </div>
          </div>
        </body>
      </html>
    `);
  });

  app.get("/api/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};