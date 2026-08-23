const environmentHost = "http://localhost:3004";

export const api: (uri: string, method: "GET" | "POST", body: any) => any = async (uri: string, method: "GET" | "POST", body: any) => {
  try {
    const headers = { "Content-Type": "application/json", Accept: "application/json" };

    const request = await fetch(`${environmentHost}/api/${uri}`, {
      method,
      headers,
      body: JSON.stringify(body),
    });

    const response = await request.json();

    return response;
  } catch (error) {
    console.error(error);
  }
};
