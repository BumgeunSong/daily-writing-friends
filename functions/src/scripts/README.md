# Scripts

## Overview
One-time administrative scripts and utility functions for database maintenance and special operations.

## Functions

### `allocateSecretBuddy`
- **Purpose**: Administrative function for allocating secret writing buddies
- **Type**: One-time script
- **Usage**: Run manually for special events or community activities

## Usage
```typescript
import { allocateSecretBuddy } from './scripts';

// Run manually or trigger via admin interface
```

## Running Scripts
Scripts can be deployed as HTTP functions for manual triggering:
```bash
# Deploy specific script
firebase deploy --only functions:allocateSecretBuddy

# Call via HTTP
curl -X POST https://your-project.cloudfunctions.net/allocateSecretBuddy
```

## Adding New Scripts
1. Create new `.ts` file in this directory
2. Export the function in `index.ts`
3. Add documentation here
4. Deploy and test