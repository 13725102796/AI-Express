// Auth.js configuration placeholder
// In production, this would configure NextAuth with providers

export const authConfig = {
  providers: [
    // Credentials provider for email/password
    // Google OAuth
    // GitHub OAuth
    // WeChat OAuth (custom provider)
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }: { auth: unknown; request: { nextUrl: { pathname: string } } }) {
      const isLoggedIn = !!auth;
      const isOnAuthPage = request.nextUrl.pathname.startsWith("/login");

      if (isOnAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/chat", request.nextUrl.toString()));
        return true;
      }

      return isLoggedIn;
    },
  },
};
