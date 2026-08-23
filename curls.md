// Create User
curl -X POST http://localhost:3004/api/admin/new-user -H "Content-Type: application/json" -d '{"email": "lucasmace4130@gmail.com", "password": "password", "fullName": "Lucas Mace", "permissions": "1000000000000000"}'

// Login Attempt
curl -X POST http://localhost:3004/api/admin/login-attempt -H "Content-Type: application/json" -d '{"email": "lucasmace4130@gmail.com", "password": "password"}'

// New Post
curl -X POST http://localhost:3004/api/admin/new-post -H "Content-Type: application/json" -d '{"title": "todays the day", "content": "Can you belive it. No question mark.", "posted_by": 1}'
