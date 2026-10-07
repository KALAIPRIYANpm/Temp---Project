import { studentInitials } from "../lib/student";

const sizeClass = {
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
};

export function ProfileAvatar({
  name,
  photo,
  size = "md",
}: {
  name: string;
  photo?: string;
  size?: keyof typeof sizeClass;
}) {
  const cls = sizeClass[size];

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`shrink-0 rounded-full border-2 border-white/25 object-cover object-center ${cls}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-white/25 bg-white/15 font-semibold text-white ${cls}`}
      aria-hidden
    >
      {studentInitials(name)}
    </div>
  );
}
