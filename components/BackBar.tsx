import Link from "next/link";

/** Persistent top-left home/back control, shared across app pages. */
export function BackBar({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a className="backbar" href={href}>
        {label}
      </a>
    );
  }
  return (
    <Link className="backbar" href={href}>
      {label}
    </Link>
  );
}
