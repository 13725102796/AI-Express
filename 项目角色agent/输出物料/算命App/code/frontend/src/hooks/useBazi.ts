'use client';

import { useState, useCallback, useMemo } from 'react';
import { calculateBazi, type BaziResult } from '@/lib/bazi';

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  shichenIndex: number;  // 0-11 or -1 for unknown
  gender: 'male' | 'female' | null;
}

const DEFAULT_INPUT: BirthInput = {
  year: 1995,
  month: 1,
  day: 1,
  shichenIndex: 0,
  gender: null,
};

export function useBazi() {
  const [input, setInput] = useState<BirthInput>(DEFAULT_INPUT);

  const updateField = useCallback(<K extends keyof BirthInput>(
    field: K,
    value: BirthInput[K]
  ) => {
    setInput((prev) => ({ ...prev, [field]: value }));
  }, []);

  const baziResult: BaziResult = useMemo(() => {
    return calculateBazi(input.year, input.month, input.day, input.shichenIndex);
  }, [input.year, input.month, input.day, input.shichenIndex]);

  return {
    input,
    setInput,
    updateField,
    baziResult,
  };
}
