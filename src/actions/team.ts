"use server";

import { requireAuth } from "./auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export interface TeamMemberItem {
  id: string;
  name: string;
  phone: string;
  role: "ADMIN" | "MODERATOR" | "MARKETER" | "CUSTOM";
  permissions: any;
  isActive: boolean;
  createdAt: string;
}

export async function getTeamMembers(): Promise<TeamMemberItem[]> {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    return [];
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role as any,
    permissions: u.permissions,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function createTeamMember(data: {
  name: string;
  phone: string;
  pin: string;
  role: "ADMIN" | "MODERATOR" | "MARKETER" | "CUSTOM";
  permissions?: any;
}) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Only administrators can add team members." };
  }

  const trimmedName = data.name.trim();
  const cleanPhone = data.phone.trim().replace(/[^\d+]/g, "");
  const trimmedPin = data.pin.trim();

  if (!trimmedName || trimmedName.length < 2) {
    return { error: "Name must be at least 2 characters long." };
  }

  if (!cleanPhone || cleanPhone.length < 8) {
    return { error: "Valid mobile phone number is required." };
  }

  if (!/^\d{6}$/.test(trimmedPin)) {
    return { error: "PIN must be exactly 6 digits." };
  }

  const existing = await db.user.findFirst({
    where: { phone: cleanPhone },
  });

  if (existing) {
    return { error: "A team member with this mobile phone number already exists." };
  }

  const salt = await bcrypt.genSalt(10);
  const pinHash = await bcrypt.hash(trimmedPin, salt);

  const newUser = await db.user.create({
    data: {
      name: trimmedName,
      phone: cleanPhone,
      pinHash,
      role: data.role as any,
      permissions: data.role === "CUSTOM" ? data.permissions : null,
      isActive: true,
    },
  });

  revalidatePath("/dashboard/settings");

  return {
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      phone: newUser.phone,
      role: newUser.role,
    },
  };
}

export async function updateTeamMember(
  id: string,
  data: {
    name: string;
    role: "ADMIN" | "MODERATOR" | "MARKETER" | "CUSTOM";
    permissions?: any;
    isActive?: boolean;
  }
) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    return { error: "Unauthorized." };
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return { error: "Team member not found." };
  }

  // Prevent admin from deactivating oneself
  if (session.user.id === id && data.isActive === false) {
    return { error: "You cannot deactivate your own admin account." };
  }

  const trimmedName = data.name.trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { error: "Name must be at least 2 characters long." };
  }

  await db.user.update({
    where: { id },
    data: {
      name: trimmedName,
      role: data.role as any,
      permissions: data.role === "CUSTOM" ? data.permissions : null,
      isActive: data.isActive !== undefined ? data.isActive : user.isActive,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function resetMemberPin(id: string, newPin: string) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    return { error: "Unauthorized." };
  }

  if (!/^\d{6}$/.test(newPin.trim())) {
    return { error: "New PIN must be exactly 6 digits." };
  }

  const salt = await bcrypt.genSalt(10);
  const pinHash = await bcrypt.hash(newPin.trim(), salt);

  await db.user.update({
    where: { id },
    data: {
      pinHash,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  // Invalidate any active sessions for this user so they re-login with new PIN
  await db.userSession.deleteMany({ where: { userId: id } }).catch(() => {});

  revalidatePath("/dashboard/settings");
  return { success: true, message: "Member PIN has been reset successfully." };
}

export async function deleteTeamMember(id: string) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    return { error: "Unauthorized." };
  }

  if (session.user.id === id) {
    return { error: "You cannot delete your own admin account." };
  }

  await db.user.delete({ where: { id } });
  revalidatePath("/dashboard/settings");
  return { success: true };
}
