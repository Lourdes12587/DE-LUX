import type { Metadata } from "next";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { NoPermission } from "@/components/admin/no-permission";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Invite member" };

export default async function InviteUserPage() {
  if ((await getCurrentUser())?.role !== "ADMIN") return <NoPermission />;
  return <InviteUserForm />;
}
