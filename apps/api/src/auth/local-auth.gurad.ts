import {  ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
    constructor() {
        super({
            keepSessionInfo: true,
        });
    }

    async canActivate(context: ExecutionContext) {
        const res = (await super.canActivate(context)) as boolean;
        const req = context.switchToHttp().getRequest();
        await super.logIn(req);
        return res;
    }
}


