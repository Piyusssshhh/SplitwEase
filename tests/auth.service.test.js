// This test proves the exact benefit we discussed: because auth.service.js
// only depends on the Repository's interface (not a real DB), we can mock
// the repository and unit test business logic with zero DB connection.

jest.mock('../src/repositories/user.repository');
jest.mock('../src/repositories/refreshToken.repository');

const userRepo = require('../src/repositories/user.repository');
const refreshTokenRepo = require('../src/repositories/refreshToken.repository');
const authService = require('../src/services/auth.service');

describe('authService.signup', () => {
  afterEach(() => jest.clearAllMocks());

  it('throws 409 if email already exists', async () => {
    userRepo.findByEmail.mockResolvedValue({ id: '123', email: 'test@test.com' });

    await expect(
      authService.signup({ name: 'Piyush', email: 'test@test.com', password: 'password123' })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('creates a user and issues tokens on valid signup', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.createLocalUser.mockResolvedValue({
      id: 'user-1',
      name: 'Piyush',
      email: 'new@test.com',
    });
    refreshTokenRepo.create.mockResolvedValue({});

    const result = await authService.signup({
      name: 'Piyush',
      email: 'new@test.com',
      password: 'password123',
    });

    expect(result.user.email).toBe('new@test.com');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(userRepo.createLocalUser).toHaveBeenCalledTimes(1);
  });
});

describe('authService.login', () => {
  afterEach(() => jest.clearAllMocks());

  it('throws 401 for non-existent user', async () => {
    userRepo.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'ghost@test.com', password: 'whatever123' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
