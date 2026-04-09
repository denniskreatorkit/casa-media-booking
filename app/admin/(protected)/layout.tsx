import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminSignOut from "@/components/AdminSignOut";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">Casa Media Admin</span>
          <Link
            href="/admin"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/photographers"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Photographers
          </Link>
          <Link
            href="/admin/bookings"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Bookings
          </Link>
          <Link
            href="/admin/packages"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Packages
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{session.user?.name}</span>
          <AdminSignOut />
        </div>
      </nav>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
