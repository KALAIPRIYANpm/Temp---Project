import { validateRollNumberAvailable } from "./db";
import { toastError } from "./toast";
import {
  isRollNumberInUseMessage,
  ROLL_NUMBER_IN_USE_MESSAGE,
  validateStudentFields,
  type FormErrors,
  type StudentFormFields,
} from "./validation";

export function toastRollNumberInUse(message?: string | null) {
  if (!isRollNumberInUseMessage(message)) return false;
  toastError(ROLL_NUMBER_IN_USE_MESSAGE, "Roll number in use");
  return true;
}

export async function validateStudentFormAsync(
  fields: {
    name: string;
    rollNumber: string;
    studentClass: string;
    medium: string;
    phone: string;
    branchId?: string;
  },
  options?: {
    excludeStudentId?: string;
  },
): Promise<FormErrors<StudentFormFields>> {
  const errors = validateStudentFields(fields, options);
  if (errors.rollNumber) {
    toastRollNumberInUse(errors.rollNumber);
    return errors;
  }

  const rollErr = await validateRollNumberAvailable(
    fields.rollNumber,
    options?.excludeStudentId,
  );
  if (rollErr) {
    errors.rollNumber = rollErr;
    toastRollNumberInUse(rollErr);
  }
  return errors;
}
