"use client";
import { signOut } from "next-auth/react";

export default function AdminSignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="text-sm text-gray-600 hover:text-gray-900"
    >
      Sign out
    </button>
  );
}
