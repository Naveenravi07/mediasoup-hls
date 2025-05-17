import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';
import { UsersService } from './../users/users.service';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UsersService;

  const mockUserService = {
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: UsersService, useValue: mockUserService }],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UsersService>(UsersService);
  });

  describe('validateLocalUser', () => {
    it('should return user data if password is valid', async () => {
      const mockUser = {
        email: 'test@example.com',
        pwd: 'hashedpwd',
        name: 'Test User',
        id: 1,
        phone: '1982182',
      };
      mockUserService.getUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      expect(await authService.validateLocalUser(mockUser.email, mockUser.pwd)).toEqual({
        name: mockUser.name,
        id: mockUser.id,
      });
    });

    it('should throw unauthorized exception if password is invalid', async () => {
      const mockUser = {
        email: 'test@example.com',
        pwd: 'hashedpwd',
        name: 'Test User',
        id: 1,
      };
      mockUserService.getUserByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.validateLocalUser(mockUser.email, 'wrongpwdbro')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
