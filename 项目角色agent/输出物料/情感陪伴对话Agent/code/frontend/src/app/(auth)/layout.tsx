import type { ReactNode } from "react";

/** Auth layout -- no bottom navigation */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      {children}
    </div>
  );
}
