import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateLocalUserRequest } from './dto/create-user-request';

const mockDb = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn(),
  where: jest.fn().mockReturnValue([]),
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([{ id: 1, email: 'test@example.com', name: 'Test User' }]),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'DRIZZLE_CLIENT',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create User', () => {
    it('should create a user successfully', async () => {
      const newUser: CreateLocalUserRequest = {
        email: 'test@example.com',
        name: 'Test User',
        pwd: '123',
        provider: 'email',
        pfpUrl: null,
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValue([]),
      });

      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValueOnce([{ ...newUser, id: 1 }]),
      });

      const result = await service.createUser(newUser);
      expect(result).toEqual({ ...newUser, id: 1, pwd: undefined });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should not create a duplicate user', async () => {
      const newUser: CreateLocalUserRequest = {
        pfpUrl: null,
        email: 'test@example.com',
        name: 'Test User',
        pwd: '123',
        provider: 'email',
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValue([{ ...newUser, id: 1 }]),
      });

      await expect(service.createUser(newUser)).rejects.toThrowError(
        new ConflictException('A user with this email already exists.'),
      );

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('get user', () => {
    it('should return the user details successfully', async () => {
      const user = {
        email: 'test@example.com',
        name: 'Test User',
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValueOnce([{ ...user, id: 1 }]),
      });

      const res = await service.getUser('1');
      expect(res).toEqual({ ...user, id: 1 });
    });

    it('should throw a NotFoundException when an invalid id is provided', async () => {
      const some_random_stupid_id = '931318318';

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValueOnce([]),
      });

      await expect(service.getUser(some_random_stupid_id)).rejects.toThrow(
        new NotFoundException(`User with id ${some_random_stupid_id} not found`),
      );
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should throw a NotFoundException when a null id is provided', async () => {
      const some_random_stupid_id = null;

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValueOnce([]),
      });

      await expect(service.getUser(some_random_stupid_id as unknown as string)).rejects.toThrow(
        new NotFoundException('User with id null not found'),
      );
      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});
