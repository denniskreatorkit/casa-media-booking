import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/admin/login",
    },
  }
);

export const config = {
  matcher: ["/admin/bookings", "/admin/bookings/:path*", "/admin/photographers", "/admin/photographers/:path*", "/admin/packages", "/admin/packages/:path*", "/admin", "/api/admin/:path*"],
};
