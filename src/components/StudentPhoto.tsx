import { studentInitials } from "../lib/student";
import type { Student } from "../types";

const sizeClass = {
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-24 w-24 text-lg",
};

export function StudentPhoto({
  student,
  size = "md",
}: {
  student: Pick<Student, "name" | "photo">;
  size?: keyof typeof sizeClass;
}) {
  const cls = sizeClass[size];

  if (student.photo) {
    return (
      <img
        src={student.photo}
        alt={student.name}
        className={`shrink-0 rounded-full border border-morning object-cover object-center ${cls}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-morning bg-morning/50 font-semibold text-cerulean ${cls}`}
      aria-hidden
    >
      {studentInitials(student.name)}
    </div>
  );
}
