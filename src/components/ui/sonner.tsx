"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// Editorial toast: ink background, uppercase label, no icons.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-none !border-0 !bg-ink !text-white !shadow-none !px-5 !py-4 !gap-1 !font-sans",
          title: "!text-[11px] !font-semibold !uppercase !tracking-[0.2em]",
          description: "!text-[12px] !text-white/70",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
