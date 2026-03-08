import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './queryErrorTracking';

describe('getErrorMessage', () => {
  it('extracts message from standard Error', () => {
    expect(getErrorMessage(new Error('something broke'))).toBe('something broke');
  });

  it('extracts message from PostgrestError-shaped plain object', () => {
    const postgrestError = {
      message: 'permission denied for table notifications',
      details: 'some details',
      hint: '',
      code: '42501',
    };
    expect(getErrorMessage(postgrestError)).toBe('permission denied for table notifications');
  });

  it('extracts message from object with only message property', () => {
    expect(getErrorMessage({ message: 'custom error' })).toBe('custom error');
  });

  it('handles string errors', () => {
    expect(getErrorMessage('plain string error')).toBe('plain string error');
  });

  it('handles null', () => {
    expect(getErrorMessage(null)).toBe('null');
  });

  it('handles undefined', () => {
    expect(getErrorMessage(undefined)).toBe('undefined');
  });

  it('handles number errors', () => {
    expect(getErrorMessage(404)).toBe('404');
  });

  it('does NOT produce [object Object] for plain objects without message', () => {
    const result = getErrorMessage({ code: '42501', details: 'no message field' });
    expect(result).not.toBe('[object Object]');
  });

  it('uses JSON.stringify for plain objects without message', () => {
    const obj = { code: '42501' };
    expect(getErrorMessage(obj)).toBe(JSON.stringify(obj));
  });

  it('handles object with nested object as message property', () => {
    const obj = { message: { nested: 'value' } };
    expect(getErrorMessage(obj)).toBe(JSON.stringify({ nested: 'value' }));
  });
});
