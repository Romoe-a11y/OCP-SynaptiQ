import { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "", ...props }: Props) {
  return (
    <div className={`glass ${className}`} {...props}>
      {children}
    </div>
  );
}