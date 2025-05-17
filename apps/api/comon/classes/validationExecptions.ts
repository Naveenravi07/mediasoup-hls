import { HttpException } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(response: any, status: number) {
    super(response, status);
  }
}
