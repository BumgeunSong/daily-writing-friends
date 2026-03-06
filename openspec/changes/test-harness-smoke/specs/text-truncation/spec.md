## Capability: Text Truncation

### Scenarios

#### S1: Text shorter than maxLength
- Given text "hello" and maxLength 10
- When truncateText is called
- Then returns "hello" unchanged

#### S2: Text exactly at maxLength
- Given text "hello" and maxLength 5
- When truncateText is called
- Then returns "hello" unchanged

#### S3: Text longer than maxLength
- Given text "hello world" and maxLength 8
- When truncateText is called
- Then returns "hello..." (5 chars + "...")

#### S4: Empty string
- Given text "" and maxLength 10
- When truncateText is called
- Then returns ""

#### S5: Very short maxLength
- Given text "hello" and maxLength 3
- When truncateText is called
- Then returns "hel" (no room for "...", just slice)
