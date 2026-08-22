"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createUser, findUserByEmail, verifyPassword } from "@/lib/repositories/users";
import { createSession, destroySession } from "@/lib/session";

export type FormState = { error?: string };

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  email: z.email("Please enter a valid email address."),
  phone: z.string().trim().min(6, "Please enter a valid phone number."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export async function signUpAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  let user;
  try {
    user = await createUser(parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return { error: "An account with that email already exists. Try signing in instead." };
    }
    return { error: "Something went wrong creating your account. Please try again." };
  }

  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  redirect("/games");
}

const signInSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

export async function signInAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user || !verifyPassword(user, parsed.data.password)) {
    return { error: "Incorrect email or password." };
  }

  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  redirect(user.role === "admin" ? "/admin" : "/games");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
