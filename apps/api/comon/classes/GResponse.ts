import { HttpStatus } from '@nestjs/common';

export class GResponse {
  status: HttpStatus = HttpStatus.OK;
  data: any = null;
  message: string = '';
  error: boolean = false;

  constructor(obj?: Partial<GResponse>) {
    if (obj) {
      this.status = obj.status ?? HttpStatus.OK;
      this.data = obj.data ?? null;
      this.message = obj.message ?? '';
      this.error = obj.error ?? false;
    }
  }
}
