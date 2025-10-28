import Image from "next/image";
import { Poppins } from "next/font/google";
import Link from "next/link";
import { cn } from "@/lib/utils";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"]
});

export const Logo = () => {
  return (
    <Link href='/'>
    <div className="hidden md:flex items-center gap-x-2">
      <Image 
        src="/Logo-D3-black.png"
        height="30"
        width="30"
        alt="Logo"
        className="dark:hidden"
      />
      <Image
        src="/Logo-D3.png"
        height="30"
        width="30"
        alt="Logo"
        className="hidden dark:block"
      />
    </div>
    </Link>
  )
}