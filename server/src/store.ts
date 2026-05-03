import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { User } from './types';

// In-memory store — swap for a real DB (PostgreSQL/SQLite) in production
const users = new Map<string, User>();
const usersByEmail = new Map<string, string>(); // email -> userId

// Hardcoded test user — always available regardless of restarts
// email: test@ambient.com  password: password123
const TEST_USER: User = {
  id: 'test-user-id',
  email: 'test@ambient.com',
  passwordHash: bcrypt.hashSync('password123', 10),
  roomId: 'test-room-id',
  createdAt: new Date(),
};
users.set(TEST_USER.id, TEST_USER);
usersByEmail.set(TEST_USER.email, TEST_USER.id);

export async function createUser(email: string, password: string): Promise<User> {
  if (usersByEmail.has(email)) {
    throw new Error('Email already registered');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user: User = {
    id: uuidv4(),
    email,
    passwordHash,
    roomId: uuidv4(), // each user gets a private room
    createdAt: new Date(),
  };
  users.set(user.id, user);
  usersByEmail.set(email, user.id);
  return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const userId = usersByEmail.get(email);
  if (!userId) return null;
  return users.get(userId) ?? null;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export function findUserById(userId: string): User | undefined {
  return users.get(userId);
}
