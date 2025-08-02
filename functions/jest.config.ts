import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json'
        }]
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    testPathIgnorePatterns: [
        '<rootDir>/src/.*\\.legacy\\.(test|spec)\\.tsx?$'
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFiles: ['<rootDir>/src/test/setup.ts'],
    testTimeout: 10000,
    // Disable coverage collection by default
    collectCoverage: false
};

export default config;