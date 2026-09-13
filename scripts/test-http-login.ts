import "dotenv/config";

async function testHttpLogin(u: string, p: string) {
  console.log(`=== TESTING HTTP LOGIN FOR ${u} ===`);
  
  // 1. Get CSRF Token
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const cookies = csrfRes.headers.get("set-cookie") || "";
  console.log("CSRF Token obtained:", csrfToken?.substring(0, 10) + "...");
  console.log("Set-Cookie from csrf:", cookies);

  // 2. Post credentials
  const body = new URLSearchParams();
  body.append("username", u);
  body.append("password", p);
  body.append("csrfToken", csrfToken);
  body.append("callbackUrl", "http://localhost:3000/admin");
  body.append("json", "true");

  const loginRes = await fetch("http://localhost:3000/api/auth/callback/admin-credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookies,
    },
    body: body.toString(),
    redirect: "manual",
  });

  console.log("Login HTTP Status:", loginRes.status);
  console.log("Login Location Header:", loginRes.headers.get("location"));
  console.log("Login Set-Cookie:", loginRes.headers.get("set-cookie"));
  const text = await loginRes.text();
  console.log("Login Response Body:", text);
}

testHttpLogin("admin", "admin123").catch(console.error);
