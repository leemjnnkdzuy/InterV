"use client";

import * as React from "react";
import { cn } from "@/app/lib/Utils";
import { Button } from "@/app/components/ui/button";
import { Pen2, AltArrowLeft, AltArrowRight } from "@solar-icons/react";
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

export function DatePicker({ value, onConfirm }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [isSaving, setIsSaving] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (value) {
      const d = new Date(value);
      setSelectedDate(d);
      setCurrentMonth(d);
    } else {
      setSelectedDate(null);
      setCurrentMonth(new Date());
    }
  }, [value, isOpen]);

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

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  // Empty slots for previous month's days
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Generate Year & Month list for direct selectors
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
        onClick={() => setIsOpen(!isOpen)}
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
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-muted/50 text-foreground/80 cursor-pointer flex items-center justify-center"
            >
              <AltArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground/90">
              {months[month]} {year}
            </span>
            <button
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
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="rounded-xl px-3 py-1 text-xs cursor-pointer"
            >
              Hủy
            </Button>
            <Button
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

