"use client";

import { motion } from "framer-motion";
import { cn } from "@/app/lib/Utils";

interface OdometerProps {
  value: number | string;
  className?: string;
  prefix?: string;
  suffix?: string;
  locale?: string;
}

const CELL = "inline-flex h-[1.2em] items-center justify-center leading-none";

function OdometerDigit({ digit }: { digit: string }) {
  const number = Number.parseInt(digit, 10);

  if (Number.isNaN(number)) {
    return <span className={CELL}>{digit}</span>;
  }

  return (
    <span className="relative inline-block h-[1.2em] overflow-hidden align-bottom">
      <motion.span
        initial={false}
        animate={{ y: `-${number * 10}%` }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="flex flex-col text-center"
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
          <span key={value} className="flex h-[1.2em] items-center justify-center leading-none">
            {value}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export function Odometer({ value, className, prefix, suffix, locale = "vi-VN" }: OdometerProps) {
  const formatted = typeof value === "number" ? new Intl.NumberFormat(locale).format(value) : value;
  const chars = formatted.split("");

  return (
    <span className={cn("inline-flex items-center tabular-nums", className)}>
      {prefix && <span className="mr-[0.2em]">{prefix}</span>}
      <span className="inline-flex items-center">
        {chars.map((char, index) => {
          const keyFromRight = chars.length - 1 - index;
          const isDigit = /\d/.test(char);

          return (
            <span key={`odo-${keyFromRight}-${isDigit ? "num" : char}`} className="inline-flex items-center">
              {isDigit ? <OdometerDigit digit={char} /> : <span className={CELL}>{char}</span>}
            </span>
          );
        })}
      </span>
      {suffix && <span className="ml-[0.25em]">{suffix}</span>}
    </span>
  );
}
