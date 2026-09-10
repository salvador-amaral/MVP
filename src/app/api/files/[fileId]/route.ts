import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase/admin";

/**
 * Short-lived access to a client-uploaded file. The staff session is verified
 * through RLS (the `files` select only returns rows of the caller's
 * organization); the browser then follows a 60-second presigned URL.
 * Use ?download=1 to force a save instead of opening in the browser.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const download = new URL(request.url).searchParams.get("download") === "1";

  const supabase = await createClient();
  const { data: file } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .maybeSingle();

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const result = download
    ? await admin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(file.storage_path, 60, { download: file.file_name })
    : await admin.storage.from(STORAGE_BUCKET).createSignedUrl(file.storage_path, 60);
  if (result.error || !result.data) {
    return NextResponse.json({ error: "Could not sign file" }, { status: 500 });
  }

  return NextResponse.redirect(result.data.signedUrl);
}
