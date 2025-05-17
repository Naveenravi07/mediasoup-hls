import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStratergy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'pwd',
    });
  }
  async validate(email: string, pwd: string, done: any) {
    const user = await this.authService.validateLocalUser(email, pwd);
    return done(null, user);
  }
}
