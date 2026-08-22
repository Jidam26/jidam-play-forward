"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBoss } from "@/lib/session";
import { createAdminAccount } from "@/lib/repositories/users";

export type CreateAdminState = { error?: string; success?: boolean };

const createAdminSchema = z.object({
  name: z.string().trim().min(2, "Please enter their full name."),
  email: z.email("Please enter a valid email address."),
  phone: z.string().trim().min(6, "Please enter a valid phone number."),
  password: z.string().min(6, "Temporary password must be at least 6 characters."),
});

/** Boss-only: create a mini-admin account with a temporary password they'll change themselves. */
export async function createAdminAction(_prevState: CreateAdminState, formData: FormData): Promise<CreateAdminState> {
  await requireBoss();

  const parsed = createAdminSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  try {
    await createAdminAccount(parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return { error: "An account with that email already exists." };
    }
    return { error: "Something went wrong creating the account. Please try again." };
  }

  revalidatePath("/admin/team");
  return { success: true };
}
