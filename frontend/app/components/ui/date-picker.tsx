"use client";

import * as React from "react";
import { cn } from "@/app/lib/Utils";
import { Button } from "@/app/components/ui/button";
import { Pen2, AltArrowLeft, AltArrowRight } from "@solar-icons/react";
import { ChevronDown, Calendar as CalendarIcon, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Spinner } from "@/app/components/ui/spinner";

interface DatePickerProps {
  value?: Date | string;
  onConfirm: (date: Date) => Promise<void>;
}

function getDateValue(value?: Date | string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function DatePicker({ value, onConfirm }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(() => getDateValue(value));
  const [currentMonth, setCurrentMonth] = React.useState(() => getDateValue(value) ?? new Date());
  const [isSaving, setIsSaving] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-slot="select-content"]') ||
        target.closest('[data-slot="select-item"]') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleYearChange = (year: number) => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setFullYear(year);
    setCurrentMonth(nextMonth);
  };

  const handleMonthChange = (month: number) => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(month);
    setCurrentMonth(nextMonth);
  };

  const handlePrevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(currentMonth);
    d.setDate(day);
    setSelectedDate(d);
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    try {
      setIsSaving(true);
      await onConfirm(selectedDate);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      const nextDate = getDateValue(value);
      setSelectedDate(nextDate);
      setCurrentMonth(nextDate ?? new Date());
    }

    setIsOpen((current) => !current);
  };

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Pen Trigger Button */}
      <button
        onClick={handleToggleOpen}
        className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/40 transition-colors cursor-pointer"
        title="Chỉnh sửa ngày sinh"
      >
        <Pen2 className="w-4 h-4" />
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-72 rounded-3xl border border-border/40 bg-card/90 p-4 shadow-xl backdrop-blur-md">
          {/* Quick Selectors for Month and Year */}
          <div className="flex items-center gap-2 mb-3">
            <Select
              value={String(month)}
              onValueChange={(val) => handleMonthChange(Number(val))}
            >
              <SelectTrigger className="flex-1 text-xs">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent position="popper">
                {months.map((m, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(year)}
              onValueChange={(val) => handleYearChange(Number(val))}
            >
              <SelectTrigger className="flex-1 text-xs">
                <SelectValue placeholder="Chọn năm" />
              </SelectTrigger>
              <SelectContent position="popper">
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Năm {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Stepper Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-muted/50 text-foreground/80 cursor-pointer flex items-center justify-center"
            >
              <AltArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground/90">
              {months[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-muted/50 text-foreground/80 cursor-pointer flex items-center justify-center"
            >
              <AltArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground mb-1">
            <span>CN</span>
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }

              const isSelected =
                selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;

              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "h-8 w-8 text-xs rounded-xl flex items-center justify-center transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : isToday
                      ? "border border-primary text-primary hover:bg-primary/10"
                      : "text-foreground hover:bg-muted/50"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="rounded-xl px-3 py-1 text-xs cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!selectedDate || isSaving}
              className="rounded-xl px-3 py-1 text-xs cursor-pointer flex items-center justify-center min-w-[70px]"
            >
              {isSaving ? <Spinner className="size-3.5" /> : "Xác nhận"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export interface DatePickerInputProps {
  value?: Date | string | null;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Chọn ngày sinh...",
  className,
  disabled = false,
}: DatePickerInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const parsedDate = getDateValue(value);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => parsedDate ?? new Date(2000, 0, 1));
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      const nextDate = getDateValue(value);
      if (nextDate) {
        setCurrentMonth(nextDate);
      }
    }
    setIsOpen((prev) => !prev);
  };

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-slot="select-content"]') ||
        target.closest('[data-slot="select-item"]') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleYearChange = (year: number) => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setFullYear(year);
    setCurrentMonth(nextMonth);
  };

  const handleMonthChange = (month: number) => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(month);
    setCurrentMonth(nextMonth);
  };

  const handlePrevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onChange?.(selected);
    setIsOpen(false);
  };

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => currentYear - i);
  const months = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const formattedDate = parsedDate
    ? `${String(parsedDate.getDate()).padStart(2, "0")}/${String(parsedDate.getMonth() + 1).padStart(2, "0")}/${parsedDate.getFullYear()}`
    : null;

  const age = parsedDate ? currentYear - parsedDate.getFullYear() : null;

  return (
    <div className={cn("relative w-full text-left", className)} ref={containerRef}>
      {/* Trigger Input container */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={handleToggleOpen}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleOpen();
          }
        }}
        className={cn(
          "w-full h-12 rounded-2xl border border-border/50 bg-background/50 px-4 text-sm flex items-center justify-between transition-all cursor-pointer select-none",
          "hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          isOpen && "border-primary ring-2 ring-primary/20 shadow-sm",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {formattedDate ? (
            <span className="text-foreground font-medium flex items-center gap-1.5 truncate">
              {formattedDate}
              {age !== null && age >= 0 && (
                <span className="text-xs font-normal text-muted-foreground">({age} tuổi)</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </div>

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-80 sm:w-84 rounded-3xl border border-border/50 bg-popover/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95">
          {/* Quick Selectors for Month and Year */}
          <div className="flex items-center gap-2 mb-3">
            <Select
              value={String(month)}
              onValueChange={(val) => handleMonthChange(Number(val))}
            >
              <SelectTrigger className="flex-1 text-xs rounded-xl h-9 bg-background/60">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-56">
                {months.map((m, idx) => (
                  <SelectItem key={idx} value={String(idx)} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(year)}
              onValueChange={(val) => handleYearChange(Number(val))}
            >
              <SelectTrigger className="flex-1 text-xs rounded-xl h-9 bg-background/60">
                <SelectValue placeholder="Chọn năm" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-56">
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">
                    Năm {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Stepper Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-muted/60 text-foreground/80 cursor-pointer flex items-center justify-center transition-colors"
            >
              <AltArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-foreground">
              {months[month]}, {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-muted/60 text-foreground/80 cursor-pointer flex items-center justify-center transition-colors"
            >
              <AltArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1.5">
            <span>CN</span>
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }

              const isSelected =
                parsedDate &&
                parsedDate.getDate() === day &&
                parsedDate.getMonth() === month &&
                parsedDate.getFullYear() === year;

              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "h-8 w-full text-xs rounded-xl flex items-center justify-center transition-all cursor-pointer font-medium",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : isToday
                      ? "border border-primary/50 text-primary hover:bg-primary/10"
                      : "text-foreground hover:bg-muted/60"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onChange?.(today);
                setIsOpen(false);
              }}
              className="text-primary font-semibold hover:underline cursor-pointer py-1 px-2 rounded-lg hover:bg-primary/10 transition-colors"
            >
              Hôm nay
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer py-1 px-2 rounded-lg hover:bg-muted/60 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Alias for DatePickerSimple as requested
export const DatePickerSimple = DatePickerInput;

export interface DateTimePickerInputProps {
  value?: Date | string | null;
  onChange?: (value: string) => void;
  min?: Date | string | null;
  max?: Date | string | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateTimePickerInput({
  value,
  onChange,
  min,
  max,
  placeholder = "Chọn thời gian...",
  className,
  disabled = false,
}: DateTimePickerInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const parsedDate = getDateValue(value);
  const minDate = getDateValue(min);
  const maxDate = getDateValue(max);

  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    () => parsedDate ?? new Date()
  );
  const containerRef = React.useRef<HTMLDivElement>(null);

  const activeDate = parsedDate ?? new Date();

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      const nextDate = getDateValue(value);
      if (nextDate) {
        setCurrentMonth(nextDate);
      }
    }
    setIsOpen((prev) => !prev);
  };

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-slot="select-content"]') ||
        target.closest('[data-slot="select-item"]') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const commitDate = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60_000;
    const localIso = new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
    onChange?.(localIso);
  };

  const handleYearChange = (year: number) => {
    const next = new Date(currentMonth);
    next.setFullYear(year);
    setCurrentMonth(next);
  };

  const handleMonthChange = (month: number) => {
    const next = new Date(currentMonth);
    next.setMonth(month);
    setCurrentMonth(next);
  };

  const handlePrevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  const handleSelectDay = (day: number) => {
    const next = new Date(activeDate);
    next.setFullYear(currentMonth.getFullYear());
    next.setMonth(currentMonth.getMonth());
    next.setDate(day);
    commitDate(next);
  };

  const handleHourChange = (hour: number) => {
    const next = new Date(activeDate);
    next.setHours(hour);
    commitDate(next);
  };

  const handleMinuteChange = (minute: number) => {
    const next = new Date(activeDate);
    next.setMinutes(minute);
    commitDate(next);
  };

  const setQuickPreset = (
    type: "now" | "plus1h" | "plus3d" | "plus7d" | "plus14d" | "endOfDay"
  ) => {
    const now = new Date();
    let next: Date;
    switch (type) {
      case "now":
        next = now;
        break;
      case "plus1h":
        next = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case "plus3d":
        next = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
      case "plus7d":
        next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "plus14d":
        next = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        break;
      case "endOfDay":
        next = new Date(activeDate);
        next.setHours(23, 59, 0, 0);
        break;
    }
    setCurrentMonth(next);
    commitDate(next);
  };

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 2 + i);
  const months = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  const formattedValue = parsedDate
    ? `${String(parsedDate.getDate()).padStart(2, "0")}/${String(
        parsedDate.getMonth() + 1
      ).padStart(2, "0")}/${parsedDate.getFullYear()} ${String(
        parsedDate.getHours()
      ).padStart(2, "0")}:${String(parsedDate.getMinutes()).padStart(2, "0")}`
    : null;

  const currentHours = activeDate.getHours();
  const currentMinutes = activeDate.getMinutes();

  return (
    <div
      className={cn("relative w-full text-left", className)}
      ref={containerRef}
    >
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={handleToggleOpen}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleOpen();
          }
        }}
        className={cn(
          "w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer select-none shadow-xs",
          "hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring",
          isOpen && "border-primary ring-1 ring-ring",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
          {formattedValue ? (
            <span className="text-foreground font-medium truncate">
              {formattedValue}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-1.5",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </div>

      {/* Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-80 rounded-2xl border border-border/80 bg-popover/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95">
          {/* Quick Selectors for Month and Year */}
          <div className="flex items-center gap-2 mb-2.5">
            <Select
              value={String(month)}
              onValueChange={(val) => handleMonthChange(Number(val))}
            >
              <SelectTrigger className="flex-1 text-xs rounded-lg h-8 bg-background/60">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-56">
                {months.map((m, idx) => (
                  <SelectItem key={idx} value={String(idx)} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(year)}
              onValueChange={(val) => handleYearChange(Number(val))}
            >
              <SelectTrigger className="flex-1 text-xs rounded-lg h-8 bg-background/60">
                <SelectValue placeholder="Chọn năm" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-56">
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">
                    Năm {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Stepper */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-md hover:bg-muted/60 text-foreground/80 cursor-pointer flex items-center justify-center transition-colors"
            >
              <AltArrowLeft className="size-3.5" />
            </button>
            <span className="text-xs font-bold text-foreground">
              {months[month]}, {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-md hover:bg-muted/60 text-foreground/80 cursor-pointer flex items-center justify-center transition-colors"
            >
              <AltArrowRight className="size-3.5" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground mb-1">
            <span>CN</span>
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }

              const cellDate = new Date(year, month, day);
              const isSelected =
                parsedDate !== null &&
                activeDate.getDate() === day &&
                activeDate.getMonth() === month &&
                activeDate.getFullYear() === year;

              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              const isBeforeMin = minDate
                ? cellDate <
                  new Date(
                    minDate.getFullYear(),
                    minDate.getMonth(),
                    minDate.getDate()
                  )
                : false;
              const isAfterMax = maxDate
                ? cellDate >
                  new Date(
                    maxDate.getFullYear(),
                    maxDate.getMonth(),
                    maxDate.getDate()
                  )
                : false;
              const isDisabledDay = isBeforeMin || isAfterMax;

              return (
                <button
                  type="button"
                  key={day}
                  disabled={isDisabledDay}
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "h-7 w-full text-xs rounded-lg flex items-center justify-center transition-all cursor-pointer font-medium",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : isToday
                      ? "border border-primary/60 text-primary hover:bg-primary/10"
                      : "text-foreground hover:bg-muted/60",
                    isDisabledDay &&
                      "opacity-30 cursor-not-allowed pointer-events-none"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div className="border-t border-border/40 pt-2.5 mb-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Clock className="size-3.5 text-primary" />
                <span>Giờ:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={currentHours}
                  onChange={(e) => handleHourChange(Number(e.target.value))}
                  className="h-7 rounded-md border border-input bg-background/80 px-2 text-xs font-semibold focus:border-primary focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="font-bold text-muted-foreground">:</span>
                <select
                  value={currentMinutes}
                  onChange={(e) => handleMinuteChange(Number(e.target.value))}
                  className="h-7 rounded-md border border-input bg-background/80 px-2 text-xs font-semibold focus:border-primary focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="border-t border-border/40 pt-2 mb-2">
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setQuickPreset("now")}
                className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                Hiện tại
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset("plus1h")}
                className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                +1 giờ
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset("plus3d")}
                className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                +3 ngày
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset("plus7d")}
                className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                +7 ngày
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset("endOfDay")}
                className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                23:59
              </button>
            </div>
          </div>

          {/* Popover Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40 text-xs">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 text-xs px-3 rounded-lg cursor-pointer"
            >
              Xong
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
