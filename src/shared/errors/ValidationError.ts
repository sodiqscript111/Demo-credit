import { AppError } from "./AppError";

export class ValidationError extends AppError {
  constructor(message = "Validation failed", code = "VALIDATION_ERROR") {
    super(message, 400, code);
  }
}
