import printf from "printf";
import { CustomError } from "./index";

export default class PropDataLoaderException extends CustomError {
  constructor(message: string) {
    super(printf("A data loader threw the following error: %e", message));
  }
}
