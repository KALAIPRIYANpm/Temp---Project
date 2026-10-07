import { useCallback, useState } from "react";
import { hasFormErrors, type FormErrors } from "../lib/validation";

export function useFormValidation<T extends string>() {
  const [errors, setErrors] = useState<FormErrors<T>>({});

  const clearField = useCallback((field: T) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  const setFieldErrors = useCallback((next: FormErrors<T>) => {
    setErrors(next);
  }, []);

  const validate = useCallback(
    (run: () => FormErrors<T>): boolean => {
      const next = run();
      setErrors(next);
      return !hasFormErrors(next);
    },
    [],
  );

  return { errors, clearField, clearAll, setFieldErrors, validate };
}
