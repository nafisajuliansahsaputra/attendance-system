import Image from "next/image";
import schoolLogo from "../../../public/brand/amaliah-logo.webp";
import { SCHOOL } from "@/config/school";

interface SchoolLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function SchoolLogo({
  size = 44,
  className = "",
  priority = false,
}: SchoolLogoProps) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={schoolLogo}
        alt={`Logo ${SCHOOL.name}`}
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
