import { isAIUBEmail, isValidStudentId } from '../../../src/utils/validators';

describe('isAIUBEmail', () => {
  it('accepts valid AIUB email', () => {
    expect(isAIUBEmail('mozahid@aiub.edu.bd')).toBe(true);
  });
  it('rejects gmail', () => {
    expect(isAIUBEmail('mozahid@gmail.com')).toBe(false);
  });
});

describe('isValidStudentId', () => {
  it('accepts valid student ID', () => {
    expect(isValidStudentId('21-45678-3')).toBe(true);
  });
  it('rejects malformed ID', () => {
    expect(isValidStudentId('2145678')).toBe(false);
  });
});
