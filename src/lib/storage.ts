import { supabase } from "./supabase";

const BUCKET = "student-photos";

export function isDataUrl(value: string | undefined): value is string {
  return Boolean(value?.startsWith("data:"));
}

export async function uploadStudentPhoto(
  studentId: string,
  dataUrl: string,
): Promise<string> {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  const path = `${studentId}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeStudentPhoto(studentId: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([`${studentId}.jpg`]);
}

export async function uploadProfilePhoto(
  profileId: string,
  dataUrl: string,
): Promise<string> {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  const path = `profiles/${profileId}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeProfilePhoto(profileId: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([`profiles/${profileId}.jpg`]);
}
