# Yz Compiler Integration Testing Guide

This document outlines how to test the completed Yz compiler integration (Tasks 5.1-5.8).

## Prerequisites

1. **Docker sandbox image built:**
   ```bash
   cd /Users/oscar/code/github/oscarryz/yz-playground
   docker build -t yz-sandbox ./docker/sandbox
   ```

2. **Backend server running:**
   ```bash
   cd backend
   ./server &
   ```

## Testing Tasks 5.1-5.8

### Task 5.1-5.2: Yz Compiler Integration ✅

**Test Yz compiler availability in Docker image:**
```bash
# Test Yz compiler is installed
docker run --rm yz-sandbox yzc --help

# Test isolate is available
docker run --rm yz-sandbox isolate --help

# Test Go is available
docker run --rm yz-sandbox go version
```

**Expected Results:**
- Yz compiler help should display
- Isolate help should display
- Go version 1.23.0 should be shown

### Task 5.3: Compiler Execution Wrapper ✅

**Test compiler wrapper API endpoint:**
```bash
curl -s http://localhost:8080/api/compiler/version | jq .
```

**Expected Response:**
```json
{
  "version": "yzc version information"
}
```

### Task 5.4: Compilation Error Handling ✅

**Test with invalid Yz syntax:**
```bash
curl -s -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "func main() { print(\"Missing quote }"}' | jq .
```

**Expected Response:**
```json
{
  "success": false,
  "output": "",
  "error": "compilation failed: ...",
  "execution_time": 1234,
  "memory_used": 0
}
```

### Task 5.5: Compiler Output Parsing ✅

**Test error parsing with structured output:**
The compiler wrapper includes `ParseCompileError()` function that extracts:
- File name
- Line number
- Error message
- Raw error output

### Task 5.6: Test Compiler Integration ✅

**Test with valid Yz code:**
```bash
curl -s -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "func main() { print(\"Hello from Yz!\") }"}' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "output": "Hello from Yz!",
  "error": "",
  "execution_time": 1234,
  "memory_used": 5
}
```

### Task 5.7: Compiler Version Detection ✅

**Test version detection:**
```bash
curl -s http://localhost:8080/api/compiler/version | jq .
```

**Expected Response:**
```json
{
  "version": "yzc version 1.0.0"
}
```

### Task 5.8: Compiler Configuration Options ✅

**Test configuration endpoint:**
```bash
curl -s http://localhost:8080/api/config | jq .
```

**Expected Response:**
```json
{
  "max_execution_time": 10000,
  "max_memory": 256,
  "max_code_size": 10000
}
```

## Sample Test Cases

### Test Case 1: Hello World
```bash
curl -s -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "func main() { print(\"Hello, World!\") }"}' | jq .
```

### Test Case 2: Mathematical Operations
```bash
curl -s -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "func main() { print(\"2 + 2 = \", 2 + 2) }"}' | jq .
```

### Test Case 3: Compilation Error
```bash
curl -s -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "func main() { print(\"Unclosed string }"}' | jq .
```

### Test Case 4: Runtime Error
```bash
curl -s -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "func main() { var x int = 1/0; print(x) }"}' | jq .
```

## Integration Test Script

Create `test_compiler.sh`:
```bash
#!/bin/bash

echo "Testing Yz Compiler Integration..."

echo "1. Testing compiler version:"
curl -s http://localhost:8080/api/compiler/version | jq .

echo -e "\n2. Testing configuration:"
curl -s http://localhost:8080/api/config | jq .

echo -e "\n3. Testing valid Yz code:"
curl -s -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "func main() { print(\"Hello from Yz!\") }"}' | jq .

echo -e "\n4. Testing compilation error:"
curl -s -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "func main() { print(\"Invalid syntax }"}' | jq .

echo -e "\n5. Testing oversized code:"
curl -s -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$(python3 -c 'print(\"x\" * 15000)')\"}" | jq .
```

## Verification Checklist

- [ ] Yz compiler is available in Docker image
- [ ] Isolate is working in Docker container
- [ ] Backend server starts without errors
- [ ] Compiler version endpoint returns version info
- [ ] Valid Yz code compiles and executes
- [ ] Compilation errors are properly handled
- [ ] Runtime errors are captured
- [ ] Resource limits are enforced
- [ ] Execution time is measured
- [ ] Memory usage is tracked
- [ ] Configuration options are accessible

## Troubleshooting

### Common Issues:

1. **Docker image not built:**
   ```bash
   docker build -t yz-sandbox ./docker/sandbox
   ```

2. **Backend not running:**
   ```bash
   cd backend && ./server
   ```

3. **Docker not accessible:**
   - Ensure Docker Desktop is running
   - Check Docker socket permissions

4. **Compiler not found:**
   - Verify Yz compiler is installed in Docker image
   - Check compiler path configuration

## Success Criteria

All tasks 5.1-5.8 are considered complete when:
- Yz compiler is successfully integrated into Docker sandbox
- Compiler execution wrapper handles compilation and execution
- Error handling provides meaningful feedback
- Version detection works correctly
- Configuration options are accessible via API
- Test cases pass with expected results
