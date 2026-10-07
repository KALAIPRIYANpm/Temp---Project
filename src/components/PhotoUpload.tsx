import { useRef, useState } from "react";
import { readStudentPhoto } from "../lib/photo";
import { toUserMessage } from "../lib/userError";
import { StudentPhoto } from "./StudentPhoto";
import { Button } from "./ui/Button";

export function PhotoUpload({
  name,
  photo,
  onChange,
}: {
  name: string;
  photo?: string;
  onChange: (photo: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await readStudentPhoto(file);
      onChange(dataUrl);
    } catch (e) {
      setError(toUserMessage(e, "Couldn't load image. Please try another file."));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-cerulean">Photo</span>
      <div className="flex flex-wrap items-center gap-4">
        <StudentPhoto student={{ name: name || "Student", photo }} size="lg" />
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {photo ? "Change photo" : "Upload photo"}
          </Button>
          {photo && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              Remove photo
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-mist">Optional. JPG or PNG, max 1 MB.</p>
    </div>
  );
}
