import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isAdminPageRoute = createRouteMatcher(["/admin(.*)"]);
const isSellerPageRoute = createRouteMatcher(["/store(.*)"]);
const isAdminApiRoute = createRouteMatcher(["/api/admin(.*)"]);
const isSellerApiRoute = createRouteMatcher(["/api/store(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const needsAdminPage = isAdminPageRoute(req);
  const needsAdminApi = isAdminApiRoute(req);
  const needsSellerPage = isSellerPageRoute(req);
  const needsSellerApi = isSellerApiRoute(req);

  if (!needsAdminPage && !needsAdminApi && !needsSellerPage && !needsSellerApi) {
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
