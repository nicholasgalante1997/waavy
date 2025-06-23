import { CustomError } from "./index";

export default class InvalidExtensionError extends CustomError {
  constructor(message: string) {
    super(message);
  }
}
